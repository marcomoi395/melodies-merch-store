import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleDestroy,
    OnModuleInit,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { OrderEntity } from '../database/entities/order.entity';
import { OrderItemEntity } from '../database/entities/order-item.entity';
import { ProductVariantEntity } from '../database/entities/product-variant.entity';
import { DiscountEntity } from '../database/entities/discount.entity';

type MomoResult = Record<string, unknown> & {
    partnerCode: string;
    orderId: string;
    requestId: string;
    amount: number;
    resultCode: number;
    transId?: string | number;
};
const failureCodes = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1017];
const createRejectionCodes = [11, 12, 13, 20, 21, 22];

@Injectable()
export class MomoService implements OnModuleInit, OnModuleDestroy {
    private timer?: ReturnType<typeof setInterval>;
    private reconciling = false;
    private readonly logger = new Logger(MomoService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly source: DataSource,
    ) {}

    private settings() {
        const partnerCode = this.config.get<string>('MOMO_PARTNER_CODE');
        const accessKey = this.config.get<string>('MOMO_ACCESS_KEY');
        const secretKey = this.config.get<string>('MOMO_SECRET_KEY');
        const apiUrl = this.config.get<string>('API_URL');
        if (
            !partnerCode ||
            !accessKey ||
            !secretKey ||
            !apiUrl ||
            [partnerCode, accessKey, secretKey].some((value) => value.startsWith('REPLACE_WITH_'))
        ) {
            throw new ServiceUnavailableException(
                'MoMo sandbox cần khóa merchant thật: MOMO_PARTNER_CODE, MOMO_ACCESS_KEY và MOMO_SECRET_KEY.',
            );
        }
        const endpoint =
            this.config.get<string>('MOMO_ENVIRONMENT', 'sandbox') === 'production'
                ? 'https://payment.momo.vn'
                : 'https://test-payment.momo.vn';
        return { partnerCode, accessKey, secretKey, apiUrl: apiUrl.replace(/\/$/, ''), endpoint };
    }

    validateAmount(amount: number) {
        this.settings();
        if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 50000000) {
            throw new BadRequestException(
                'MoMo yêu cầu số tiền nguyên từ 1.000 đến 50.000.000 VND.',
            );
        }
    }

    private signature(fields: Record<string, string | number>) {
        const raw = Object.keys(fields)
            .sort()
            .map((key) => `${key}=${fields[key]}`)
            .join('&');
        return createHmac('sha256', this.settings().secretKey).update(raw).digest('hex');
    }

    private async request(
        path: string,
        body: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
        const response = await fetch(`${this.settings().endpoint}/v2/gateway/api/${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
                Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'accessKey')),
            ),
            signal: AbortSignal.timeout(35000),
        });
        if (!response.ok) {
            throw new Error('MoMo gateway unavailable');
        }
        return (await response.json()) as Record<string, unknown>;
    }

    async prepare(manager: EntityManager, order: OrderEntity) {
        this.validateAmount(Number(order.totalAmount));
        return manager.save(TransactionEntity, {
            id: randomUUID(),
            orderId: order.id,
            type: 'PAYMENT',
            provider: 'MOMO',
            amount: order.totalAmount,
            status: 'PENDING',
            createdAt: new Date(),
            rawResponse: { requestId: randomUUID() },
        });
    }

    async create(payment: TransactionEntity) {
        const { partnerCode, accessKey, apiUrl } = this.settings();
        const fields = {
            accessKey,
            partnerCode,
            amount: Number(payment.amount),
            extraData: '',
            ipnUrl: `${apiUrl}/payment/momo/ipn`,
            orderId: payment.id,
            orderInfo: `Thanh toan don hang ${payment.orderId}`,
            redirectUrl: `${apiUrl}/payment/momo/return?payment=${payment.id}`,
            requestId: String(payment.rawResponse!.requestId),
            requestType: 'captureWallet',
        };
        const previouslyAttempted = payment.rawResponse?.createAttempted === true;
        const claim = await this.source
            .getRepository(TransactionEntity)
            .createQueryBuilder()
            .update()
            .set({ rawResponse: () => `raw_response || '{"createAttempted":true}'::jsonb` })
            .where('id = :id AND status = :status', { id: payment.id, status: 'PENDING' })
            .execute();
        if (!claim.affected) {
            return { paymentId: payment.id, paymentUrl: null };
        }
        try {
            const result = await this.request('create', {
                ...fields,
                signature: this.signature(fields),
                lang: 'vi',
                autoCapture: true,
            });
            if (
                result.partnerCode !== partnerCode ||
                result.orderId !== payment.id ||
                result.requestId !== fields.requestId ||
                !Number.isInteger(result.resultCode) ||
                (result.amount !== undefined && Number(result.amount) !== fields.amount)
            ) {
                throw new Error('Invalid MoMo create response');
            }
            if (!previouslyAttempted && createRejectionCodes.includes(Number(result.resultCode))) {
                await this.settle(
                    { ...result, amount: Number(payment.amount) } as MomoResult,
                    true,
                    true,
                );
                return { paymentId: payment.id, paymentUrl: null };
            }
            if (result.resultCode !== 0) {
                // Creation errors may describe a duplicate/in-flight request. Query before releasing stock.
                return { paymentId: payment.id, paymentUrl: null };
            }
            const url = new URL(String(result.payUrl));
            if (
                url.protocol !== 'https:' ||
                url.origin !== this.settings().endpoint ||
                url.username ||
                url.password
            ) {
                throw new Error('Invalid MoMo payment URL');
            }
            await this.source
                .getRepository(TransactionEntity)
                .createQueryBuilder()
                .update()
                .set({ rawResponse: () => 'raw_response || CAST(:response AS jsonb)' })
                .setParameter('response', JSON.stringify({ payUrl: url.href }))
                .where('id = :id AND status = :status', { id: payment.id, status: 'PENDING' })
                .execute();
            return { paymentId: payment.id, paymentUrl: url.href };
        } catch {
            this.logger.warn(`MoMo checkout unresolved: ${payment.id}`);
            // A timeout can happen after MoMo accepts the charge. Keep the order for reconciliation.
            return { paymentId: payment.id, paymentUrl: null };
        }
    }

    private result(body: unknown): MomoResult {
        if (!body || typeof body !== 'object') {
            throw new BadRequestException('Invalid MoMo result');
        }
        const value = body as Record<string, unknown>;
        for (const key of ['partnerCode', 'orderId', 'requestId']) {
            if (typeof value[key] !== 'string' || value[key].length > 255) {
                throw new BadRequestException('Invalid MoMo result');
            }
        }
        if (
            !Number.isSafeInteger(value.amount) ||
            Number(value.amount) < 1000 ||
            !Number.isSafeInteger(value.resultCode)
        ) {
            throw new BadRequestException('Invalid MoMo result');
        }
        if (
            value.transId !== undefined &&
            !(typeof value.transId === 'number' && Number.isSafeInteger(value.transId)) &&
            !(typeof value.transId === 'string' && /^\d{1,30}$/.test(value.transId))
        ) {
            throw new BadRequestException('Invalid MoMo transaction ID');
        }
        if (value.resultCode === 0 && (value.transId === undefined || Number(value.transId) <= 0)) {
            throw new BadRequestException('Missing MoMo transaction ID');
        }
        return value as MomoResult;
    }

    async ipn(body: unknown) {
        const result = this.result(body);
        const { accessKey, partnerCode } = this.settings();
        const fields: Record<string, string | number> = { accessKey };
        for (const key of [
            'amount',
            'extraData',
            'message',
            'orderId',
            'orderInfo',
            'orderType',
            'partnerCode',
            'payType',
            'requestId',
            'responseTime',
            'resultCode',
            'transId',
        ]) {
            if (typeof result[key] !== 'string' && typeof result[key] !== 'number') {
                throw new BadRequestException('Invalid MoMo IPN');
            }
            fields[key] = result[key];
        }
        const actual = result.signature;
        const expected = this.signature(fields);
        if (
            result.partnerCode !== partnerCode ||
            typeof actual !== 'string' ||
            !/^[a-fA-F0-9]{64}$/.test(actual) ||
            !timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
        ) {
            throw new BadRequestException('Invalid MoMo signature');
        }
        await this.settle(result, true);
    }

    private async settle(result: MomoResult, checkRequestId = false, rejectedCreate = false) {
        return this.source.transaction(async (manager) => {
            await manager.query("SET LOCAL lock_timeout = '5s'");
            const payment = await manager.findOne(TransactionEntity, {
                where: { id: result.orderId, provider: 'MOMO', type: 'PAYMENT' },
                lock: { mode: 'pessimistic_write' },
            });
            if (!payment) {
                throw new NotFoundException('Payment not found');
            }
            if (
                Number(payment.amount) !== result.amount ||
                (checkRequestId && payment.rawResponse?.requestId !== result.requestId)
            ) {
                throw new BadRequestException('MoMo payment mismatch');
            }
            if (payment.status === 'SUCCESS') {
                return payment;
            }
            if (
                result.resultCode !== 0 &&
                !failureCodes.includes(result.resultCode) &&
                !rejectedCreate
            ) {
                return payment;
            }
            if (payment.status === 'FAILED' && result.resultCode !== 0) {
                return payment;
            }
            const released = payment.status === 'FAILED';
            const order = await manager.findOneOrFail(OrderEntity, {
                where: { id: payment.orderId! },
                lock: { mode: 'pessimistic_write' },
            });
            payment.status = result.resultCode === 0 ? 'SUCCESS' : 'FAILED';
            payment.gatewayTransactionId = result.transId == null ? null : String(result.transId);
            payment.rawResponse = { ...payment.rawResponse, resultCode: result.resultCode };
            if (payment.status === 'SUCCESS') {
                // ponytail: released stock requires staff review; add refund/re-reservation with that workflow.
                order.status = released ? 'PENDING' : 'PROCESSING';
                if (released) {
                    payment.rawResponse.requiresReview = true;
                }
            } else {
                order.status = 'CANCELLED';
                const items = await manager.find(OrderItemEntity, { where: { orderId: order.id } });
                for (const item of items) {
                    if (item.productVariantId) {
                        await manager.increment(
                            ProductVariantEntity,
                            { id: item.productVariantId },
                            'stockQuantity',
                            item.quantity,
                        );
                    }
                }
                if (order.appliedVoucher) {
                    await manager
                        .createQueryBuilder()
                        .update(DiscountEntity)
                        .set({ usedCount: () => 'GREATEST(COALESCE(used_count, 0) - 1, 0)' })
                        .where('code = :code', { code: order.appliedVoucher })
                        .execute();
                }
            }
            await manager.save(OrderEntity, order);
            return manager.save(TransactionEntity, payment);
        });
    }

    async refresh(id: string) {
        let payment = await this.source.getRepository(TransactionEntity).findOneBy({
            id,
            provider: 'MOMO',
            type: 'PAYMENT',
        });
        if (!payment) {
            throw new NotFoundException('Payment not found');
        }
        if (payment.status === 'PENDING') {
            const claim = await this.source
                .getRepository(TransactionEntity)
                .createQueryBuilder()
                .update()
                .set({ updatedAt: new Date() })
                .where('id = :id AND status = :status', { id, status: 'PENDING' })
                .andWhere("updated_at < NOW() - INTERVAL '5 seconds'")
                .execute();
            if (claim.affected) {
                const { partnerCode, accessKey } = this.settings();
                const fields = { accessKey, partnerCode, orderId: id, requestId: randomUUID() };
                try {
                    const response = await this.request('query', {
                        ...fields,
                        signature: this.signature(fields),
                        lang: 'vi',
                    });
                    if (
                        response.partnerCode !== partnerCode ||
                        response.orderId !== id ||
                        response.requestId !== fields.requestId
                    ) {
                        throw new Error('MoMo query mismatch');
                    }
                    if (response.resultCode === 42 && !payment.rawResponse?.payUrl) {
                        await this.create(payment);
                    } else {
                        payment = await this.settle(this.result(response));
                    }
                } catch {
                    // Network errors and non-matching responses do not prove payment failure.
                }
            }
            payment = await this.source.getRepository(TransactionEntity).findOneByOrFail({ id });
        }
        return {
            paymentId: payment.id,
            orderId: payment.orderId,
            status: payment.status,
            amount: Number(payment.amount),
            requiresReview: payment.rawResponse?.requiresReview === true,
            paymentUrl: payment.status === 'PENDING' ? (payment.rawResponse?.payUrl ?? null) : null,
        };
    }

    returnUrl(id: string) {
        const url = new URL('/payment/result', this.config.getOrThrow<string>('CUSTOMER_APP_URL'));
        url.searchParams.set('payment', id);
        return url.href;
    }

    onModuleInit() {
        if (!this.config.get('MOMO_PARTNER_CODE')) {
            return;
        }
        this.timer = setInterval(() => {
            void this.reconcile();
        }, 60000);
        this.timer.unref();
    }

    onModuleDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    private async reconcile() {
        if (this.reconciling) {
            return;
        }
        this.reconciling = true;
        try {
            const payments = await this.source
                .getRepository(TransactionEntity)
                .createQueryBuilder('payment')
                .where('payment.provider = :provider AND payment.status = :status', {
                    provider: 'MOMO',
                    status: 'PENDING',
                })
                .andWhere("payment.created_at < NOW() - INTERVAL '1 minute'")
                .orderBy('payment.updated_at', 'ASC')
                .take(20)
                .getMany();
            for (const payment of payments) {
                await this.refresh(payment.id);
                await this.source
                    .getRepository(TransactionEntity)
                    .createQueryBuilder()
                    .update()
                    .set({ updatedAt: new Date() })
                    .where('id = :id', { id: payment.id })
                    .execute();
            }
        } catch {
            this.logger.warn('MoMo reconciliation deferred');
            // Retry next minute; never cancel a charge based on a local timeout.
        } finally {
            this.reconciling = false;
        }
    }
}
