import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { StaffService } from './staff.service';
import { RegisterStaffDto } from './dto/register-staff.dto';

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
}
