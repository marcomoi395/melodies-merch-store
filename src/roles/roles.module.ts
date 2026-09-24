import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from 'src/database/entities/permission.entity';
import { RoleEntity } from 'src/database/entities/role.entity';

@Module({
    imports: [TypeOrmModule.forFeature([RoleEntity, PermissionEntity])],
    controllers: [RolesController],
    providers: [RolesService],
})
export class RolesModule {}
