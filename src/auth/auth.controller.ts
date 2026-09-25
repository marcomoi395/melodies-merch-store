import {
    Body,
    Controller,
    ForbiddenException,
    HttpCode,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { UserEntity } from 'src/database/entities/user.entity';
import { IJwtPayload } from './auth.interface';
import { AuthService } from './auth.service';
import { RefreshTokenDto, RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    registerUser(@Body() payload: RegisterUserDto) {
        void payload;
        return Promise.reject(new ForbiddenException('Customer registration is disabled'));
    }

    @UseGuards(AuthGuard('local'))
    @HttpCode(200)
    @Post('login')
    async login(@Req() req: Request & { user: UserEntity }) {
        const data = await this.authService.login(req.user);
        return {
            statusCode: 200,
            message: 'Login successful',
            data,
        };
    }

    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    @Post('logout')
    async logout(@Req() req: Request & { user: IJwtPayload }, @Body() payload: RefreshTokenDto) {
        await this.authService.logout(payload.refreshToken, req.user.sub);

        return {
            statusCode: 200,
            message: 'Logout successful',
        };
    }

    @HttpCode(200)
    @Post('refresh')
    async refreshTokens(@Body() payload: RefreshTokenDto) {
        const data = await this.authService.refreshTokens(payload.refreshToken);

        return {
            statusCode: 200,
            message: 'Tokens refreshed successfully',
            data,
        };
    }

    @Post('forgot-password')
    @HttpCode(200)
    forgotPassword(@Body() body: ForgotPasswordDto) {
        void body;
        return Promise.reject(new ForbiddenException('Customer password recovery is disabled'));
    }

    @Post('reset-password')
    @HttpCode(200)
    resetPassword(@Body() body: ResetPasswordDto) {
        void body;
        return Promise.reject(new ForbiddenException('Customer password recovery is disabled'));
    }
}
