import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { AuthGuard } from '@nestjs/passport';
import { RequiredPermission } from 'src/permissions/permissions.decorator';
import { PermissionGuard } from 'src/permissions/permissions.guard';
import { plainToInstance } from 'class-transformer';
import { PromotionResponseDto } from './dto/promotion-response.dto';

@Controller('admin/promotion')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequiredPermission('PROMOTION', 'MANAGE')
export class PromotionController {
    constructor(private readonly promotionService: PromotionService) {}

    @Get()
    async getAllPromotionCodes() {
        const result = await this.promotionService.getAllPromotionCodes();

        const mappedData = plainToInstance(PromotionResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Promotions fetched successfully',
            data: mappedData,
        };
    }

    @Post()
    async createNewPromotionCode(@Body() body: CreatePromotionDto) {
        const result = await this.promotionService.createNewPromotionCode(body);

        const mappedData = plainToInstance(PromotionResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 201,
            message: 'Promotion created successfully',
            data: mappedData,
        };
    }

    @Patch(':id')
    async updatePromotionCode(
        @Body() body: UpdatePromotionDto,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        const result = await this.promotionService.updatePromotionCode(id, body);

        const mappedData = plainToInstance(PromotionResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Promotion updated successfully',
            data: mappedData,
        };
    }

    @Delete(':id')
    async removePromotionCode(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        await this.promotionService.removePromotionCode(id);

        return {
            statusCode: 204,
            message: 'Promotion deleted successfully',
        };
    }
}
