import { IsString, IsOptional, MaxLength, IsObject } from 'class-validator';

export class UpdateArtistDto {
    @IsString()
    @IsOptional()
    @MaxLength(255)
    stageName?: string;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsOptional()
    avatarUrl?: string;

    @IsOptional()
    @IsObject()
    metadata?: any;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    status?: string;
}
