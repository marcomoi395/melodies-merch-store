import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('admin/roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    @Get()
    async getRoles() {
        const result = await this.rolesService.getRoles();

        return {
            statusCode: 200,
            message: 'Roles fetched successfully',
            data: result,
        };
    }

    @Post()
    async createNewRoleForAdmin(@Body() body: CreateRoleDto) {
        const result = await this.rolesService.createNewRoleForAdmin(body);

        return {
            statusCode: 201,
            message: 'Role created successfully',
            data: result,
        };
    }

    @Patch(':id')
    async updateRoleForAdmin(
        @Body() body: UpdateRoleDto,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        const result = await this.rolesService.updateRoleForAdmin(id, body);

        return {
            statusCode: 200,
            message: 'Role updated successfully',
            data: result,
        };
    }

    @Delete(':id')
    async deleteRoleForAdmin(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        const result = await this.rolesService.deleteRoleForAdmin(id);

        return {
            statusCode: 200,
            message: 'Role deleted successfully',
            data: result,
        };
    }
}
