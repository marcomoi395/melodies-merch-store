import { Module } from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { ArtistsAdminController } from './controllers/artists.admin.controller';
import { ArtistsPublicController } from './controllers/artists.public.controller';

@Module({
    controllers: [ArtistsAdminController, ArtistsPublicController],
    providers: [ArtistsService],
})
export class ArtistsModule {}
