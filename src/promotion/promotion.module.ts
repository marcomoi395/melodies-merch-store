import { Module } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountEntity } from 'src/database/entities/discount.entity';

@Module({
    imports: [TypeOrmModule.forFeature([DiscountEntity])],
    controllers: [PromotionController],
    providers: [PromotionService],
})
export class PromotionModule {}
