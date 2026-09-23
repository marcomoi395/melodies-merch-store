import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DiscountEntity } from 'src/database/entities/discount.entity';
import { Repository } from 'typeorm';
import { CreatePromotionDto, DiscountType } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionService {
    constructor(@InjectRepository(DiscountEntity) private discounts: Repository<DiscountEntity>) {}

    async getAllPromotionCodes() {
        return this.discounts.find();
    }

    async createNewPromotionCode(payload: CreatePromotionDto) {
        const findPromotion = await this.discounts.findOneBy({ code: payload.code });

        if (findPromotion) {
            throw new ConflictException('Promotion with this code already exists');
        }

        if (
            payload.type === DiscountType.PERCENTAGE &&
            (payload.value < 0 || payload.value > 100)
        ) {
            throw new BadRequestException('Percentage value must be between 0 and 100');
        }

        const { startDate, endDate, ...rest } = payload;

        return this.discounts.save(
            this.discounts.create({
                ...rest,
                value: String(rest.value),
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
            }),
        );
    }

    async updatePromotionCode(id: string, data: UpdatePromotionDto) {
        const existingDiscount = await this.discounts.findOneBy({ id });
        if (!existingDiscount) {
            throw new NotFoundException('Discount not found');
        }

        const finalType = data.type !== undefined ? data.type : existingDiscount.type;
        const finalValue = data.value !== undefined ? data.value : existingDiscount.value;

        if (finalType === 'percentage') {
            const numericValue = Number(finalValue);
            if (numericValue < 0 || numericValue > 100) {
                throw new BadRequestException('Percentage value must be between 0 and 100');
            }
        }

        const { startDate, endDate, value: _value, ...rest } = data;

        return this.discounts.save({
            ...existingDiscount,
            ...rest,
            ...(data.value !== undefined && { value: String(data.value) }),
            ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
            ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        });
    }

    async removePromotionCode(id: string) {
        const existingDiscount = await this.discounts.findOneBy({ id });
        if (!existingDiscount) {
            throw new NotFoundException('Discount not found');
        }

        await this.discounts.remove(existingDiscount);
        return existingDiscount;
    }
}
