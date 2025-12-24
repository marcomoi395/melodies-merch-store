import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RedisModule } from './redis/redis.module';
import Joi from 'joi';

@Module({
    imports: [
        PrismaModule,
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                DATABASE_URL: Joi.string().required(),
                JWT_SECRET: Joi.string().required(),
                REDIS_HOST: Joi.string().required(),
                REDIS_PORT: Joi.number().required(),
                REDIS_DB: Joi.number().optional(),
            }),
            validationOptions: {
                allowUnknown: true,
                abortEarly: false,
            },
        }),
        AuthModule,
        RedisModule,
        UserModule,
    ],
})
export class AppModule {}
