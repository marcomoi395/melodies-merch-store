import { IsString } from 'class-validator';

export class GetProductDetailDto {
    @IsString()
    slug: string;
}
