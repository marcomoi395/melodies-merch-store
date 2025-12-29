import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateStaffDto {
    @IsString()
    @IsOptional()
    fullName: string;

    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @IsArray()
    @IsOptional()
    @IsString({ each: true, message: 'Each role ID must be a string' })
    roleIds: string[];
}
