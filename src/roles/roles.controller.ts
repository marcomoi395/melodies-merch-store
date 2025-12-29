import { Body, Controller, Post } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Controller('admin/roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    @Post()
    async createNewRoleForAdmin(@Body() body: CreateRoleDto) {
        const result = await this.rolesService.createNewRoleForAdmin(body);

        return {
            statusCode: 201,
            message: 'Role created successfully',
            data: result,
        };
    }
}
