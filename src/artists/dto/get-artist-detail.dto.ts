import { IsString, IsUUID } from 'class-validator';

export class GetArtistDetailDto {
    @IsString()
    @IsUUID('4')
    id: string;
}
