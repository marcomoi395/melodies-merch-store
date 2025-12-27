import { Body, Controller, Get, HttpCode, Patch, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from './dto/update-user.dto';
import { IJwtPayload } from 'src/auth/auth.interface';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    async getUserProfile(@Req() req: Request & { user: IJwtPayload }) {
        return {
            statusCode: 200,
            messagfe: 'User profile fetched successfully',
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
            messagfe: 'Update profile info successfully',
            data: await this.userService.updateProfileInfo(req.user.sub, payload),
        };
    }
}
