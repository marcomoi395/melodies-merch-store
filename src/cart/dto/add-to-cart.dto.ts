// dto/add-to-cart.dto.ts
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AddToCartDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsString()
    @IsNotEmpty()
    productVariantId: string;

    @IsInt()
    @Min(1)
    quantity: number;
}
