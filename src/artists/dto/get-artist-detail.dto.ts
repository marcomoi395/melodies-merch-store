import { IsNotEmpty, IsString } from 'class-validator';

export class GetArtistDetailDto {
    @IsString()
    @IsNotEmpty()
    slug: string;
}
