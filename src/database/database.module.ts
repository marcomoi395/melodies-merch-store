import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDataSourceOptions } from './database-options';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) =>
                createDataSourceOptions({
                    DATABASE_URL: configService.get<string>('DATABASE_URL'),
                    DATABASE_SCHEMA: configService.get<string>('DATABASE_SCHEMA'),
                }),
        }),
    ],
})
export class DatabaseModule {}
