import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { configureApplication } from './runtime/application';

describe('application bootstrap security', () => {
    const app = {
        get: jest.fn().mockReturnValue({}),
        useGlobalPipes: jest.fn(),
        useGlobalInterceptors: jest.fn(),
        setGlobalPrefix: jest.fn(),
        enableCors: jest.fn(),
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(SwaggerModule, 'createDocument').mockReturnValue({} as any);
        jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => undefined);
    });

    afterEach(() => jest.restoreAllMocks());

    it('passes only configured origins to CORS', () => {
        const config = {
            getOrThrow: jest.fn().mockReturnValue('https://shop.example, http://localhost:3001'),
            get: jest.fn().mockReturnValue(false),
        } as unknown as ConfigService;

        configureApplication(app, config);

        expect(app.enableCors).toHaveBeenCalledWith({
            origin: ['https://shop.example', 'http://localhost:3001'],
        });
    });

    it('does not initialize Swagger unless explicitly enabled', () => {
        const config = {
            getOrThrow: jest.fn().mockReturnValue('https://shop.example'),
            get: jest.fn().mockReturnValue(false),
        } as unknown as ConfigService;

        configureApplication(app, config);

        expect(SwaggerModule.createDocument).not.toHaveBeenCalled();
        expect(SwaggerModule.setup).not.toHaveBeenCalled();
    });

    it('initializes generated Swagger metadata when enabled', () => {
        const config = {
            getOrThrow: jest.fn().mockReturnValue('https://shop.example'),
            get: jest.fn().mockReturnValue(true),
        } as unknown as ConfigService;

        configureApplication(app, config);

        expect(SwaggerModule.createDocument).toHaveBeenCalled();
        expect(SwaggerModule.setup).toHaveBeenCalledWith('api', app, {});
    });
});
