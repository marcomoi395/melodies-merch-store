import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { configureApplication } from './runtime/application';

export async function bootstrap() {
    const { AppModule } = await import('./app.module');
    const app = await NestFactory.create(AppModule, { rawBody: true });
    const config = app.get(ConfigService);

    configureApplication(app, config);

    await app.listen(config.get<number>('PORT', 3000));
}

void bootstrap();
