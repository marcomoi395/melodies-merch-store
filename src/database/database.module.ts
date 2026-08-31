import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDataSourceOptions } from './data-source';

const typeOrmImports =
    process.env.TYPEORM_ENABLED === 'false'
        ? []
        : [
              TypeOrmModule.forRootAsync({
                  imports: [ConfigModule],
                  inject: [ConfigService],
                  useFactory: (configService: ConfigService) =>
                      createDataSourceOptions({
                          DATABASE_URL: configService.get<string>('DATABASE_URL'),
                      }),
              }),
          ];

@Module({
    imports: typeOrmImports,
})
export class DatabaseModule {}
