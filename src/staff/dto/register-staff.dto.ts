import {
    IsArray,
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    ArrayNotEmpty,
} from 'class-validator';

export class RegisterStaffDto {
    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty({ message: 'Email should not be empty' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Full name should not be empty' })
    fullName: string;

    @IsOptional()
    phone?: string;

    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @IsArray()
    @ArrayNotEmpty({ message: 'Role IDs should not be empty' })
    @IsString({ each: true, message: 'Each role ID must be a string' })
    roleIds: string[];
}
