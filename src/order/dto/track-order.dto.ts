import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class TrackOrderDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @Matches(/^(?=.*\d)[0-9+().\s-]+$/, {
        message: 'Phone must contain digits and phone characters',
    })
    @MinLength(7)
    @MaxLength(20)
    phone?: string;
}
