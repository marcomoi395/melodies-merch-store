import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserEntity } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { v4 } from 'uuid';
import { IJwtPayload, IRegisterUser } from './auth.interface';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
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

    async login(user: User) {
        const tokenId = v4();

        const payload: IJwtPayload = {
            sub: user.id,
            email: user.email,
            jti: tokenId,
        };

        const accessToken = this.jwt.sign(payload, {
            expiresIn: '15m',
        });
        const refreshToken = this.jwt.sign(payload, {
            expiresIn: '7d',
        });

        // Save the refresh token to redis
        const key = `whitelist:${user.id}:${tokenId}`;
        const ttl = 7 * 24 * 60 * 60;

        await this.redis.set(key, refreshToken, 'EX', ttl);

        return {
            accessToken,
            refreshToken,
            user,
        };
    }

    async logout(refreshToken: string, userId: string) {
        try {
            const decode: IJwtPayload = this.jwt.verify(refreshToken);

            if (userId !== decode.sub) {
                throw new BadRequestException('Invalid token for user');
            }

            const key = `whitelist:${decode.sub}:${decode.jti}`;
            await this.redis.del(key);
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException('Invalid refresh token');
        }
    }
}
