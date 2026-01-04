import { Controller, Get, HttpCode, Param, Query } from '@nestjs/common';
import { ArtistsService } from '../artists.service';
import { GetArtistsDto } from '../dto/get-artists.dto';
import { GetArtistDetailDto } from '../dto/get-artist-detail.dto';
import { plainToInstance } from 'class-transformer';
import { ArtistResponseDto } from '../dto/artist-response.dto';

@Controller('artists')
export class ArtistsPublicController {
    constructor(private readonly artistsService: ArtistsService) {}

    @Get()
    @HttpCode(200)
    async getArtists(@Query() query: GetArtistsDto) {
        const { data, meta } = await this.artistsService.getArtists(query);

        const mappedData = plainToInstance(ArtistResponseDto, data, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Artists fetched successfully',
            data: mappedData,
            meta,
        };
    }

    @Get(':slug')
    @HttpCode(200)
    async getArtistDetail(@Param() param: GetArtistDetailDto) {
        const result = await this.artistsService.getArtistDetail(param.slug);

        const mappedData = plainToInstance(ArtistResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Artist detail fetched successfully',
            data: mappedData,
        };
    }
}
