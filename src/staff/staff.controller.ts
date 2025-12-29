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
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Controller('admin/staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) {}

    @Get()
    @HttpCode(200)
    async getAllStaff() {
        const result = await this.staffService.getAllStaff();

        return {
            statusCode: 200,
            message: 'Staff retrieved successfully',
            data: result,
        };
    }

    @Post()
    async registerStaffForAdmin(@Body() body: RegisterStaffDto) {
        const result = await this.staffService.registerStaffForAdmin(body);

        return {
            statusCode: 201,
            message: 'Staff registered successfully',
            data: result,
        };
    }

    @Patch(':id')
    async updateStaffForAdmin(
        @Body() body: UpdateStaffDto,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        const result = await this.staffService.updateStaffForAdmin(id, body);

        return {
            statusCode: 200,
            message: 'Staff updated successfully',
            data: result,
        };
    }

    @Delete(':id')
    async deleteAccountForAdmin(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        const result = await this.staffService.deleteAccountForAdmin(id);

        return {
            statusCode: 200,
            message: 'Account deleted successfully',
            data: result,
        };
    }
}
