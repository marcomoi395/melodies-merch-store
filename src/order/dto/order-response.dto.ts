import { Expose, Type } from 'class-transformer';
import { DecimalToNumber } from 'src/products/dto/product-response.dto';

export class OrderItemResponseDto {
    @Expose()
    id: string;

    @Expose()
    productId: string;

    @Expose()
    productVariantId: string;

    @Expose()
    productName: string;

    @Expose()
    variantName: string;

    @Expose()
    quantity: number;

    @Expose()
    @DecimalToNumber()
    price: number;

    @Expose()
    @DecimalToNumber()
    originalPrice: number;

    @Expose()
    @DecimalToNumber()
    discountPercentage: number;

    @Expose()
    @DecimalToNumber()
    totalLinePrice: number;
}

export class OrderResponseDto {
    @Expose()
    id: string;

    @Expose()
    email: string;

    @Expose()
    fullName: string;

    @Expose()
    phone: string;

    @Expose()
    status: string;

    @Expose()
    @DecimalToNumber()
    subtotal: number;

    @Expose()
    @DecimalToNumber()
    shippingFee: number;

    @Expose()
    @DecimalToNumber()
    discountAmount?: number;

    @Expose()
    @DecimalToNumber()
    totalAmount: number;

    @Expose()
    appliedVoucher: string;

    @Expose()
    paymentMethod: string;

    @Expose()
    shippingAddress: string;

    @Expose()
    note: string;

    @Expose()
    createdAt: Date;

    @Expose()
    @Type(() => OrderItemResponseDto)
    orderItems: OrderItemResponseDto[];
}
