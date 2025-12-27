import { IsString, IsUUID } from 'class-validator';

export class GetProductDetailDto {
    @IsString()
    @IsUUID('4')
    id: string;
}
