import { Injectable } from '@nestjs/common';
import { User } from 'generated/prisma/browser';
import { PrismaService } from 'src/prisma/prisma.service';

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
}
