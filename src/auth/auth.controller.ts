import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('/register')
    async registerUser(@Body() payload: RegisterUserDto) {
        const data = await this.authService.registerUserForClient(payload);

        return {
            statusCode: 201,
            message: 'User registered successfully',
            data,
        };
    }
}
