import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { User } from 'generated/prisma/browser';
import { IJwtPayload } from './auth.interface';
import { AuthService } from './auth.service';
import { RefreshTokenDto, RegisterUserDto } from './dto/register-user.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    async registerUser(@Body() payload: RegisterUserDto) {
        const data = await this.authService.registerUserForClient(payload);

        return {
            statusCode: 201,
            message: 'User registered successfully',
            data,
        };
    }

    @UseGuards(AuthGuard('local'))
    @HttpCode(200)
    @Post('login')
    async login(@Req() req: Request & { user: User }) {
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
}
