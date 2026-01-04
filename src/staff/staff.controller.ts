import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { AuthGuard } from '@nestjs/passport';
import { RequiredPermission } from 'src/permissions/permissions.decorator';
import { PermissionGuard } from 'src/permissions/permissions.guard';
import { plainToInstance } from 'class-transformer';
import { StaffResponseDto } from './dto/staff-response.dto';

@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequiredPermission('STAFF', 'MANAGE')
@Controller('admin/staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) {}

    @Get()
    @HttpCode(200)
    async getAllStaff() {
        const result = await this.staffService.getAllStaff();

        const mappedData = plainToInstance(StaffResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Staff retrieved successfully',
            data: mappedData,
        };
    }

    @Post()
    async registerStaffForAdmin(@Body() body: RegisterStaffDto) {
        const result = await this.staffService.registerStaffForAdmin(body);

        const mappedData = plainToInstance(StaffResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 201,
            message: 'Staff registered successfully',
            data: mappedData,
        };
    }

    @Patch(':id')
    async updateStaffForAdmin(
        @Body() body: UpdateStaffDto,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        const result = await this.staffService.updateStaffForAdmin(id, body);

        const mappedData = plainToInstance(StaffResponseDto, result, {
            excludeExtraneousValues: true,
        });

        return {
            statusCode: 200,
            message: 'Staff updated successfully',
            data: mappedData,
        };
    }

    @Delete(':id')
    async deleteAccountForAdmin(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        await this.staffService.deleteAccountForAdmin(id);

        return {
            statusCode: 200,
            message: 'Account deleted successfully',
        };
    }
}
