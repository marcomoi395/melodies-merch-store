import { Expose } from 'class-transformer';
import { DecimalToNumber } from 'src/products/dto/product-response.dto';

export class TrackedOrderResponseDto {
    @Expose()
    id: string;

    @Expose()
    createdAt: Date;

    @Expose()
    status: string;

    @Expose()
    trackingCode: string | null;

    @Expose()
    paymentMethod: string;

    @Expose()
    @DecimalToNumber()
    subtotal: number;

    @Expose()
    @DecimalToNumber()
    shippingFee: number;

    @Expose()
    @DecimalToNumber()
    discountAmount: number;

    @Expose()
    @DecimalToNumber()
    totalAmount: number;
}
