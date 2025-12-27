import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @IsString()
    @MaxLength(30, { message: 'Mật khẩu cũ không được quá 30 ký tự' })
    @MinLength(6, { message: 'Mật khẩu cũ phải có ít nhất 6 ký tự' })
    oldPassword: string;

    @IsString()
    @MaxLength(30, { message: 'Mật khẩu mới không được quá 30 ký tự' })
    @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
    newPassword: string;
}
