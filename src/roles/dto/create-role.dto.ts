import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray } from 'class-validator';

export class CreateRoleDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNotEmpty({ each: true })
    @IsArray()
    @IsUUID('4', { each: true })
    permissionIds: string[];
}
