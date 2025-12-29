import { Controller, Get, HttpCode, Param, Query } from '@nestjs/common';
import { ArtistsService } from '../artists.service';
import { GetArtistsDto } from '../dto/get-artists.dto';
import { GetArtistDetailDto } from '../dto/get-artist-detail.dto';

@Controller('artists')
export class ArtistsPublicController {
    constructor(private readonly artistsService: ArtistsService) {}

    @Get()
    @HttpCode(200)
    async getArtists(@Query() query: GetArtistsDto) {
        const result = await this.artistsService.getArtists(query);

        return {
            statusCode: 200,
            message: 'Artists fetched successfully',
            ...result,
        };
    }

    @Get(':id')
    @HttpCode(200)
    async getArtistDetail(@Param() param: GetArtistDetailDto) {
        const result = await this.artistsService.getArtistDetail(param.id);

        return {
            statusCode: 200,
            message: 'Artist detail fetched successfully',
            data: result,
        };
    }
}
