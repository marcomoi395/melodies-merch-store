import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from 'generated/prisma/browser';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

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
}
