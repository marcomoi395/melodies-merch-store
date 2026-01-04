import { Expose } from 'class-transformer';
import { DecimalToNumber } from 'src/products/dto/product-response.dto';

export class PromotionResponseDto {
    @Expose()
    id: string;

    @Expose()
    code: string;

    @Expose()
    description: string;

    @Expose()
    type: string;

    @Expose()
    @DecimalToNumber()
    value: number;

    @Expose()
    startDate: Date;

    @Expose()
    endDate: Date;

    @Expose()
    usageLimit: number;

    @Expose()
    usedCount: number;

    @Expose()
    isActive: boolean;

    @Expose()
    appliesTo: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;
}
