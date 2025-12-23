import { ConflictException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserEntity } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { IRegisterUser } from './auth.interface';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private user: UserService,
        private jwt: JwtService,
    ) {}

    async registerUserForClient(payload: IRegisterUser): Promise<User> {
        const findUser = await this.user.findOneByEmail(payload.email);
        if (findUser) {
            throw new ConflictException('User with this email already exists');
        }

        const hashPassword = await bcrypt.hash(payload.password, 10);

        const { password, ...userData } = payload;

        const newUser = await this.prisma.user.create({
            data: {
                ...userData,
                passwordHash: hashPassword,
            },
        });

        return new UserEntity(newUser);
    }

    async validateUser(email: string, password: string): Promise<User | null> {
        const findUser = await this.user.findOneByEmail(email);
        if (!findUser || !findUser.passwordHash) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, findUser.passwordHash);

        if (isPasswordValid) {
            const { passwordHash, ...userData } = findUser;
            return userData as User;
        }

        return null;
    }

    login(user: User) {
        const payload: { sub: string; email: string } = {
            sub: user.id,
            email: user.email,
        };

        const accessToken = this.jwt.sign(payload, {
            expiresIn: '15m',
        });
        const refreshToken = this.jwt.sign(payload, {
            expiresIn: '7d',
        });

        return {
            accessToken,
            refreshToken,
            user,
        };
    }
}
