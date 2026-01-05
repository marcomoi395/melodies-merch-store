import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    app.setGlobalPrefix('api');
    app.enableCors();

    try {
        const openApiFilePath = join(process.cwd(), 'openapi.yaml');
        const fileContent = fs.readFileSync(openApiFilePath, 'utf8');
        const document = yaml.load(fileContent);

        SwaggerModule.setup('api', app, document as OpenAPIObject);
    } catch (error) {
        console.error('Lỗi không đọc được file OpenAPI:', error);
    }

    await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
