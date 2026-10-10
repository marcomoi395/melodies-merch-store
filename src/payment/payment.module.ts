import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { Module } from '@nestjs/common';
import { MomoService } from './momo.service';
import { MomoController } from './momo.controller';

@Module({
    providers: [MomoService, StripeService],
    controllers: [MomoController, StripeController],
    exports: [MomoService, StripeService],
})
export class PaymentModule {}
