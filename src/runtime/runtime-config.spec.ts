import { isSwaggerEnabled, parseCorsOrigins } from './runtime-config';

describe('runtime configuration', () => {
    it('parses and normalizes a configured CORS allowlist', () => {
        expect(parseCorsOrigins(' https://shop.example, http://localhost:3001/ ')).toEqual([
            'https://shop.example',
            'http://localhost:3001',
        ]);
    });

    it.each(['*', 'shop.example', 'javascript:alert(1)', ''])(
        'rejects invalid CORS origins: %s',
        (value) => {
            expect(() => parseCorsOrigins(value)).toThrow();
        },
    );

    it('enables Swagger only for an explicit true value', () => {
        expect(isSwaggerEnabled(true)).toBe(true);
        expect(isSwaggerEnabled('true')).toBe(true);
        expect(isSwaggerEnabled(false)).toBe(false);
        expect(isSwaggerEnabled(undefined)).toBe(false);
    });
});
