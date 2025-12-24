import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { Request } from 'express';
import { IJwtPayload } from './auth.interface';

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
    async logout(@Req() req: Request & { user: IJwtPayload }) {
        const refreshToken = req.header('x-refresh-token');

        if (!refreshToken) {
            throw new BadRequestException('Refresh token is required in header');
        }

        await this.authService.logout(refreshToken, req.user.sub);

        return {
            statusCode: 200,
            message: 'Logout successful',
        };
    }
}
