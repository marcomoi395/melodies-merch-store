import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { MomoService } from './momo.service';

@Controller('payment/momo')
export class MomoController {
    constructor(private readonly momo: MomoService) {}

    @Post('ipn')
    @HttpCode(204)
    async ipn(@Body() body: Record<string, unknown>) {
        await this.momo.ipn(body);
    }

    @Get('return')
    returnToStore(
        @Query('payment', new ParseUUIDPipe()) payment: string,
        @Res() response: Response,
    ) {
        response.setHeader('Referrer-Policy', 'no-referrer');
        response.redirect(303, this.momo.returnUrl(payment));
    }

    @Get(':id/status')
    async status(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Res({ passthrough: true }) response: Response,
    ) {
        response.setHeader('Cache-Control', 'no-store');
        return { statusCode: 200, message: 'Payment status', data: await this.momo.refresh(id) };
    }
}
