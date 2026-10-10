import {
    Controller,
    Get,
    Headers,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Post,
    RawBodyRequest,
    Req,
    Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeService } from './stripe.service';

@Controller('payment/stripe')
export class StripeController {
    constructor(private readonly stripe: StripeService) {}

    @Post('webhook')
    @HttpCode(204)
    async webhook(
        @Req() request: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ) {
        await this.stripe.webhook(request.rawBody, signature);
    }

    @Get(':id/status')
    async status(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Res({ passthrough: true }) response: Response,
    ) {
        response.setHeader('Cache-Control', 'no-store');
        return { statusCode: 200, message: 'Payment status', data: await this.stripe.refresh(id) };
    }
}
