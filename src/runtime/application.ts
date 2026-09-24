import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { isSwaggerEnabled, parseCorsOrigins } from './runtime-config';

export function configureApplication(app: INestApplication, config: ConfigService): void {
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    app.setGlobalPrefix('api');

    app.enableCors({
        origin: parseCorsOrigins(config.getOrThrow<string>('CORS_ORIGINS')),
    });

    if (isSwaggerEnabled(config.get<boolean | string>('SWAGGER_ENABLED'))) {
        try {
            const document = SwaggerModule.createDocument(
                app,
                new DocumentBuilder()
                    .setTitle('Melodies Merch Store API')
                    .setVersion('1.0')
                    .build(),
            );
            SwaggerModule.setup('api', app, document);
        } catch {
            // Documentation is optional; application startup must remain available.
        }
    }
}
