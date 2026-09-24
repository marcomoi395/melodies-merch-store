const HTTP_SCHEMES = new Set(['http:', 'https:']);

export function parseCorsOrigins(value: string): string[] {
    const origins = value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (!origins.length) {
        throw new Error('CORS_ORIGINS must contain at least one origin');
    }

    return origins.map((origin) => {
        const parsed = new URL(origin);
        if (!HTTP_SCHEMES.has(parsed.protocol) || parsed.origin !== origin.replace(/\/$/, '')) {
            throw new Error(`Invalid CORS origin: ${origin}`);
        }
        return parsed.origin;
    });
}

export function isSwaggerEnabled(value: boolean | string | undefined): boolean {
    return value === true || value === 'true';
}
