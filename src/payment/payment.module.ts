import { Module } from '@nestjs/common';
import { MomoService } from './momo.service';
import { MomoController } from './momo.controller';

@Module({ providers: [MomoService], controllers: [MomoController], exports: [MomoService] })
export class PaymentModule {}
