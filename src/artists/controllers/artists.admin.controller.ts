import {
    Body,
    Controller,
    Delete,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ArtistsService } from '../artists.service';
import { CreateArtistDto } from '../dto/create-artist.dto';
import { UpdateArtistDto } from '../dto/update-artist.dto';
import { AuthGuard } from '@nestjs/passport';
import { RequiredPermission } from 'src/permissions/permissions.decorator';
import { PermissionGuard } from 'src/permissions/permissions.guard';
import { plainToInstance } from 'class-transformer';
import { ArtistResponseDto } from '../dto/artist-response.dto';

@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequiredPermission('BRAND', 'MANAGE')
@Controller('admin/artists')
export class ArtistsAdminController {
    constructor(private readonly artistsService: ArtistsService) {}

    @Post()
    async createNewArtistForAdmin(@Body() body: CreateArtistDto) {
        const result = await this.artistsService.createArtistForAdmin(body);

        const mappedData = plainToInstance(ArtistResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 201,
            message: 'Artist created successfully',
            data: mappedData,
        };
    }

    @Patch(':id')
    @HttpCode(200)
    async updateArtistForAdmin(
        @Body() body: UpdateArtistDto,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        const result = await this.artistsService.updateArtistForAdmin(id, body);

        const mappedData = plainToInstance(ArtistResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Artist updated successfully',
            data: mappedData,
        };
    }

    @Delete(':id')
    @HttpCode(200)
    async deleteArtistForAdmin(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        await this.artistsService.deleteArtistForAdmin(id);

        return {
            statusCode: 200,
            message: 'Artist deleted successfully',
        };
    }
}
