import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from 'generated/prisma/browser';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

    async findOneByEmail(email: string): Promise<User | null> {
        return await this.prisma.user.findUnique({
            where: { email: email },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
    }

    async getUserProfile(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException("User doesn't exist");
        }

        return new UserEntity(user);
    }

    async updateProfileInfo(userId: string, payload: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException("User doesn't exist");
        }

        return await this.prisma.user.update({ where: { id: userId }, data: payload });
    }

    async changePassword(userId: string, payload: ChangePasswordDto) {
        if (payload.newPassword === payload.oldPassword) {
            throw new BadRequestException('New password must be different from old password');
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user || !user.passwordHash) {
            throw new NotFoundException('User not found or invalid account state');
        }

        const isPasswordValid = await bcrypt.compare(payload.oldPassword, user.passwordHash);

        if (!isPasswordValid) {
            throw new BadRequestException("Old password doesn't match");
        }

        const newPasswordHash = await bcrypt.hash(payload.newPassword, 10);

        return await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });
    }
}
