import { Body, Controller, Get, HttpCode, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from './dto/update-user.dto';
import { IJwtPayload } from 'src/auth/auth.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerificationTokenDto } from './dto/verification-token.dto';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    async getUserProfile(@Req() req: Request & { user: IJwtPayload }) {
        return {
            statusCode: 200,
            message: 'User profile fetched successfully',
            data: await this.userService.getUserProfile(req.user.sub),
        };
    }

    @Patch('profile')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    async updateProfileInfo(
        @Req() req: Request & { user: IJwtPayload },
        @Body() payload: UpdateUserDto,
    ) {
        return {
            statusCode: 200,
            message: 'Update profile info successfully',
            data: await this.userService.updateProfileInfo(req.user.sub, payload),
        };
    }

    @Patch('change-password')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    async changePassword(
        @Req() req: Request & { user: IJwtPayload },
        @Body() payload: ChangePasswordDto,
    ) {
        await this.userService.changePassword(req.user.sub, payload);

        return {
            statusCode: 200,
            message: 'Password changed successfully',
        };
    }

    @Get('request-verification-email')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    async requestVerificationEmail(@Req() req: Request & { user: IJwtPayload }) {
        await this.userService.requestVerificationEmail(req.user.sub, req.user.email);
        return {
            statusCode: 200,
            message: 'Verification email sent successfully',
        };
    }

    @Post('verify-account')
    @HttpCode(200)
    async verificationToken(@Body() payload: VerificationTokenDto) {
        await this.userService.verificationToken(payload.token);

        return {
            statusCode: 200,
            message: 'Account verified successfully',
        };
    }
}
