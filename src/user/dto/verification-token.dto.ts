import { IsString, IsNotEmpty } from 'class-validator';

export class VerificationTokenDto {
    @IsString()
    @IsNotEmpty()
    token: string;
}
