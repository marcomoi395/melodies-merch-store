import { Module } from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { ArtistsAdminController } from './controllers/artists.admin.controller';
import { ArtistsPublicController } from './controllers/artists.public.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtistEntity } from 'src/database/entities/artist.entity';
import { OrderItemEntity } from 'src/database/entities/order-item.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ArtistEntity, OrderItemEntity])],
    controllers: [ArtistsAdminController, ArtistsPublicController],
    providers: [ArtistsService],
})
export class ArtistsModule {}
