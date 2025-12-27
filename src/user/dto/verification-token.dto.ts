import { IsString, IsNotEmpty } from 'class-validator';

export class VerificationTokenDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    token: string;
}
