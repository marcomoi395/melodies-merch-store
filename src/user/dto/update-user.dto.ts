import { IsEmail, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsEmail({}, { message: 'Email không đúng định dạng' })
    email?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100, { message: 'Tên không được quá 100 ký tự' })
    fullName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20, { message: 'Số điện thoại không được quá 20 ký tự' })
    phone?: string;

    @IsOptional()
    @IsString()
    @IsUrl({}, { message: 'Thumbnail phải là một đường dẫn URL hợp lệ' })
    avatarUrl?: string;
}
