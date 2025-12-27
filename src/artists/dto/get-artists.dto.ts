import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetArtistsDto {
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    limit?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    page?: number;
}
