import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePromotionDto, DiscountType } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionService {
    constructor(private prisma: PrismaService) {}

    async getAllPromotionCodes() {
        return this.prisma.discount.findMany();
    }

    async createNewPromotionCode(payload: CreatePromotionDto) {
        const findPromotion = await this.prisma.discount.findUnique({
            where: { code: payload.code },
        });

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

        return this.prisma.discount.create({
            data: {
                ...rest,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
            },
        });
    }

    async updatePromotionCode(id: string, data: UpdatePromotionDto) {
        const existingDiscount = await this.prisma.discount.findUnique({ where: { id } });
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

        const { startDate, endDate, ...rest } = data;

        return this.prisma.discount.update({
            where: { id },
            data: {
                ...rest,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
            },
        });
    }

    async removePromotionCode(id: string) {
        const existingDiscount = await this.prisma.discount.findUnique({ where: { id } });
        if (!existingDiscount) {
            throw new NotFoundException('Discount not found');
        }

        return this.prisma.discount.delete({
            where: { id },
        });
    }
}
