import { IsOptional, IsString } from 'class-validator';
import { GetProductsDto } from './get-products.dto';

export class GetProductsForAdminDto extends GetProductsDto {
    @IsOptional()
    @IsString()
    status?: string;
}
