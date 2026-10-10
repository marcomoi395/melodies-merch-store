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

type Session = {
    id: string;
    livemode: boolean;
    currency: string;
    amount_total: number;
    client_reference_id: string;
    metadata: { paymentId: string; orderId: string };
    status: string;
    payment_status: string;
    payment_intent: string | null;
    url: string | null;
};

@Injectable()
export class StripeService implements OnModuleInit, OnModuleDestroy {
    private timer?: ReturnType<typeof setInterval>;
    private reconciling = false;
    private readonly logger = new Logger(StripeService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly source: DataSource,
    ) {}

    private settings() {
        const key = this.config.get<string>('STRIPE_SECRET_KEY', '');
        const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
        if (
            this.config.get('STRIPE_ENVIRONMENT', 'test') !== 'test' ||
            !/^sk_test_[A-Za-z0-9]+$/.test(key) ||
            !/^whsec_[A-Za-z0-9]+$/.test(secret)
        ) {
            throw new ServiceUnavailableException(
                'Stripe test cần STRIPE_SECRET_KEY (sk_test_...) và STRIPE_WEBHOOK_SECRET (whsec_...).',
            );
        }
        return { key, secret };
    }

    validateAmount(amount: number) {
        this.settings();
        if (!Number.isSafeInteger(amount) || amount < 12000 || amount > 99999999) {
            throw new BadRequestException(
                'Stripe yêu cầu số tiền nguyên từ 12.000 đến 99.999.999 VND.',
            );
        }
    }

    returnUrl(id: string) {
        const url = new URL('/payment/result', this.config.getOrThrow<string>('CUSTOMER_APP_URL'));
        url.searchParams.set('payment', id);
        url.searchParams.set('provider', 'stripe');
        return url.href;
    }

    async prepare(manager: EntityManager, order: OrderEntity) {
        this.validateAmount(Number(order.totalAmount));
        const id = randomUUID();
        const body = new URLSearchParams({
            mode: 'payment',
            'payment_method_types[0]': 'card',
            client_reference_id: id,
            'metadata[paymentId]': id,
            'metadata[orderId]': order.id,
            'line_items[0][price_data][currency]': 'vnd',
            'line_items[0][price_data][unit_amount]': String(Number(order.totalAmount)),
            'line_items[0][price_data][product_data][name]': `Thanh toan don hang ${order.id}`,
            'line_items[0][quantity]': '1',
            success_url: this.returnUrl(id),
            cancel_url: this.returnUrl(id),
            expires_at: String(Math.floor(Date.now() / 1000) + 86400),
        });
        return manager.save(TransactionEntity, {
            id,
            orderId: order.id,
            type: 'PAYMENT',
            provider: 'STRIPE',
            amount: order.totalAmount,
            status: 'PENDING',
            createdAt: new Date(),
            rawResponse: { checkoutBody: body.toString() },
        });
    }

    private async request(path: string, body?: string, id?: string): Promise<Session> {
        const response = await fetch(`https://api.stripe.com/v1/checkout/sessions${path}`, {
            method: body ? 'POST' : 'GET',
            headers: {
                Authorization: `Bearer ${this.settings().key}`,
                'Stripe-Version': '2024-06-20',
                ...(body
                    ? {
                          'Content-Type': 'application/x-www-form-urlencoded',
                          'Idempotency-Key': id!,
                      }
                    : {}),
            },
            ...(body ? { body } : {}),
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
            throw new Error('Stripe gateway unavailable');
        }
        return (await response.json()) as Session;
    }

    private validateSession(session: Session, payment: TransactionEntity) {
        if (
            !session ||
            typeof session.id !== 'string' ||
            !/^cs_test_[A-Za-z0-9]+$/.test(session.id) ||
            session.livemode !== false ||
            session.currency !== 'vnd' ||
            session.amount_total !== Number(payment.amount) ||
            session.client_reference_id !== payment.id ||
            session.metadata?.paymentId !== payment.id ||
            session.metadata?.orderId !== payment.orderId ||
            (payment.rawResponse?.sessionId && payment.rawResponse.sessionId !== session.id) ||
            !['open', 'complete', 'expired'].includes(session.status) ||
            !['paid', 'unpaid', 'no_payment_required'].includes(session.payment_status)
        ) {
            throw new BadRequestException('Stripe payment mismatch');
        }
    }

    async create(payment: TransactionEntity) {
        // ponytail: retry only inside Stripe's 24-hour idempotency retention; older unknown attempts need staff review.
        if (!payment.createdAt || Date.now() - payment.createdAt.getTime() > 23 * 3600000) {
            return { paymentId: payment.id, paymentUrl: null };
        }
        try {
            if (typeof payment.rawResponse?.checkoutBody !== 'string') {
                throw new Error('Missing Stripe checkout');
            }
            const session = await this.request('', payment.rawResponse.checkoutBody, payment.id);
            this.validateSession(session, payment);
            let paymentUrl: string | null = null;
            if (session.status === 'open' && session.url) {
                const url = new URL(session.url);
                if (url.origin !== 'https://checkout.stripe.com' || url.username || url.password) {
                    throw new Error('Invalid Stripe checkout URL');
                }
                paymentUrl = url.href;
            }
            await this.source
                .getRepository(TransactionEntity)
                .createQueryBuilder()
                .update()
                .set({ rawResponse: () => 'raw_response || CAST(:response AS jsonb)' })
                .setParameter(
                    'response',
                    JSON.stringify({ sessionId: session.id, payUrl: paymentUrl }),
                )
                .where('id = :id AND status = :status', { id: payment.id, status: 'PENDING' })
                .execute();
            await this.settle(session);
            return { paymentId: payment.id, paymentUrl };
        } catch {
            this.logger.warn(`Stripe checkout unresolved: ${payment.id}`);
            // Timeout does not prove failure: retain stock and retry the same payment.
            return { paymentId: payment.id, paymentUrl: null };
        }
    }

    async webhook(raw: Buffer | undefined, signature: string | undefined) {
        if (!raw || typeof signature !== 'string' || !signature) {
            throw new BadRequestException('Missing Stripe signature');
        }
        const fields = signature.split(',').map((field) => field.trim().split('='));
        const timestamp = fields.find(([key]) => key === 't')?.[1];
        if (
            !timestamp ||
            !/^\d+$/.test(timestamp) ||
            Math.abs(Date.now() / 1000 - Number(timestamp)) > 300
        ) {
            throw new BadRequestException('Expired Stripe signature');
        }
        const expected = createHmac('sha256', this.settings().secret)
            .update(`${timestamp}.`)
            .update(raw)
            .digest();
        if (
            !fields.some(
                ([key, value]) =>
                    key === 'v1' &&
                    /^[a-fA-F0-9]{64}$/.test(value) &&
                    timingSafeEqual(Buffer.from(value, 'hex'), expected),
            )
        ) {
            throw new BadRequestException('Invalid Stripe signature');
        }
        let event: { livemode: boolean; type: string; data: { object: Session } };
        try {
            event = JSON.parse(raw.toString()) as typeof event;
        } catch {
            throw new BadRequestException('Invalid Stripe event');
        }
        if (!event || event.livemode !== false) {
            throw new BadRequestException('Stripe test events only');
        }
        if (['checkout.session.completed', 'checkout.session.expired'].includes(event.type)) {
            if (!event.data?.object) {
                throw new BadRequestException('Invalid Stripe session');
            }
            await this.settle(event.data.object);
        }
    }

    private async settle(session: Session) {
        const id = session?.metadata?.paymentId;
        if (
            typeof id !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        ) {
            throw new BadRequestException('Invalid Stripe payment ID');
        }
        return this.source.transaction(async (manager) => {
            await manager.query("SET LOCAL lock_timeout = '5s'");
            const payment = await manager.findOne(TransactionEntity, {
                where: { id, provider: 'STRIPE', type: 'PAYMENT' },
                lock: { mode: 'pessimistic_write' },
            });
            if (!payment) {
                throw new NotFoundException('Payment not found');
            }
            this.validateSession(session, payment);
            if (payment.status === 'SUCCESS') {
                return payment;
            }
            const paid = session.status === 'complete' && session.payment_status === 'paid';
            const failed = session.status === 'expired' && session.payment_status === 'unpaid';
            if ((!paid && !failed) || (payment.status === 'FAILED' && !paid)) {
                return payment;
            }
            const released = payment.status === 'FAILED';
            const order = await manager.findOneOrFail(OrderEntity, {
                where: { id: payment.orderId! },
                lock: { mode: 'pessimistic_write' },
            });
            payment.status = paid ? 'SUCCESS' : 'FAILED';
            payment.gatewayTransactionId =
                typeof session.payment_intent === 'string' ? session.payment_intent : null;
            payment.rawResponse = { ...payment.rawResponse, sessionId: session.id };
            if (paid) {
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
        const repository = this.source.getRepository(TransactionEntity);
        let payment = await repository.findOneBy({ id, provider: 'STRIPE', type: 'PAYMENT' });
        if (!payment) {
            throw new NotFoundException('Payment not found');
        }
        if (payment.status === 'PENDING') {
            const claim = await repository
                .createQueryBuilder()
                .update()
                .set({ updatedAt: new Date() })
                .where('id = :id AND status = :status', { id, status: 'PENDING' })
                .andWhere('updated_at < :queryBefore', { queryBefore: new Date(Date.now() - 5000) })
                .execute();
            if (claim.affected) {
                try {
                    if (typeof payment.rawResponse?.sessionId === 'string') {
                        await this.settle(
                            await this.request(
                                `/${encodeURIComponent(payment.rawResponse.sessionId)}`,
                            ),
                        );
                    } else {
                        await this.create(payment);
                    }
                } catch {
                    /* Retry later; never release stock on network failure. */
                }
                payment = await repository.findOneByOrFail({ id });
            }
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

    onModuleInit() {
        if (!this.config.get('STRIPE_SECRET_KEY')) {
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
                    provider: 'STRIPE',
                    status: 'PENDING',
                })
                .andWhere('payment.created_at < :createdBefore', {
                    createdBefore: new Date(Date.now() - 60000),
                })
                .orderBy('payment.updated_at', 'ASC')
                .take(20)
                .getMany();
            for (const payment of payments) {
                await this.refresh(payment.id);
            }
        } catch {
            this.logger.warn('Stripe reconciliation deferred');
        } finally {
            this.reconciling = false;
        }
    }
}
