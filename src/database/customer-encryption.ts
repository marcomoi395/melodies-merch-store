import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import type { ValueTransformer } from 'typeorm';

export function customerEncryptionKey(): Buffer {
    const value = process.env.CUSTOMER_DATA_ENCRYPTION_KEY;
    if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
        throw new Error(
            'CUSTOMER_DATA_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters',
        );
    }
    return Buffer.from(value, 'hex');
}

export function encryptCustomerValue(field: string, value: unknown): string | null | undefined {
    if (value === null || value === undefined) {
        return value;
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', customerEncryptionKey(), iv);
    cipher.setAAD(Buffer.from(`orders:${field}:v1`));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return `enc:v1:${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64')}`;
}

export function decryptCustomerValue(field: string, value: unknown): unknown {
    if (value === null || value === undefined) {
        return value;
    }
    if (typeof value !== 'string' || !/^enc:v1:[A-Za-z0-9+/]+={0,2}$/.test(value)) {
        throw new Error('Invalid encrypted customer data');
    }
    const bytes = Buffer.from(value.slice(7), 'base64');
    if (bytes.length < 29) {
        throw new Error('Invalid encrypted customer data');
    }
    const decipher = createDecipheriv(
        'aes-256-gcm',
        customerEncryptionKey(),
        bytes.subarray(0, 12),
    );
    decipher.setAAD(Buffer.from(`orders:${field}:v1`));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
        Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'),
    );
}

export function customerTransformer(field: string): ValueTransformer {
    return {
        to: (value: unknown) => encryptCustomerValue(field, value),
        from: (value: unknown) => decryptCustomerValue(field, value),
    };
}

export function customerLookup(field: 'email' | 'phone', value: string | null): string | null {
    if (value === null) {
        return null;
    }
    let normalized = field === 'email' ? value.trim().toLowerCase() : value.replace(/\D/g, '');
    if (field === 'phone' && normalized.startsWith('84') && normalized.length === 11) {
        normalized = `0${normalized.slice(2)}`;
    }
    // ponytail: one key version; rotation requires re-encryption and rebuilding lookup hashes.
    return createHmac('sha256', customerEncryptionKey())
        .update(`orders:lookup:v1:${field}:${normalized}`)
        .digest('hex');
}
