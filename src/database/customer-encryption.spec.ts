import { customerEncryptionKey, customerLookup, customerTransformer } from './customer-encryption';
import { CustomerLookupSubscriber } from './subscribers/customer-lookup.subscriber';

const originalKey = process.env.CUSTOMER_DATA_ENCRYPTION_KEY;
beforeEach(() => {
    process.env.CUSTOMER_DATA_ENCRYPTION_KEY = 'ab'.repeat(32);
});
afterAll(() => {
    if (originalKey === undefined) {
        delete process.env.CUSTOMER_DATA_ENCRYPTION_KEY;
    } else {
        process.env.CUSTOMER_DATA_ENCRYPTION_KEY = originalKey;
    }
});

describe('customer data encryption', () => {
    it('round trips contact fields, Unicode, JSON addresses and nulls with randomized ciphertext', () => {
        for (const [field, value] of Object.entries({
            email: 'customer@example.com',
            full_name: 'Nguyễn Văn An',
            phone: '0901234567',
            shipping_address: { city: 'Hồ Chí Minh' },
            note: '',
        })) {
            const transformer = customerTransformer(field);
            const encrypted = transformer.to(value);
            expect(encrypted).not.toContain(JSON.stringify(value));
            expect(transformer.to(value)).not.toBe(encrypted);
            expect(transformer.from(encrypted)).toEqual(value);
            expect(transformer.from(transformer.to(null))).toBeNull();
            expect(transformer.to(undefined)).toBeUndefined();
        }
    });

    it('rejects tampering, the wrong key, swapped fields and plaintext', () => {
        const transformer = customerTransformer('email');
        const encrypted: string = transformer.to('private@example.com');
        const bytes = Buffer.from(encrypted.slice(7), 'base64');
        bytes[bytes.length - 1] ^= 1;
        expect(() => transformer.from(`enc:v1:${bytes.toString('base64')}`)).toThrow();
        expect(() => customerTransformer('phone').from(encrypted)).toThrow();
        expect(() => transformer.from('private@example.com')).toThrow();
        process.env.CUSTOMER_DATA_ENCRYPTION_KEY = 'cd'.repeat(32);
        expect(() => transformer.from(encrypted)).toThrow();
        delete process.env.CUSTOMER_DATA_ENCRYPTION_KEY;
        expect(() => transformer.to('value')).toThrow('CUSTOMER_DATA_ENCRYPTION_KEY');
        process.env.CUSTOMER_DATA_ENCRYPTION_KEY = 'not-a-key';
        expect(customerEncryptionKey).toThrow('CUSTOMER_DATA_ENCRYPTION_KEY');
    });

    it('normalizes keyed lookups and maintains them on partial writes', () => {
        expect(customerLookup('email', ' Test@Example.com ')).toBe(
            customerLookup('email', 'test@example.com'),
        );
        expect(customerLookup('phone', '+84 901-234-567')).toBe(
            customerLookup('phone', '0901234567'),
        );
        expect(customerLookup('email', '0901234567')).not.toBe(
            customerLookup('phone', '0901234567'),
        );
        const subscriber = new CustomerLookupSubscriber();
        const entity = {
            email: 'Test@example.com',
            phone: null,
            emailLookup: null,
            phoneLookup: 'old',
        };
        subscriber.beforeInsert({ entity } as any);
        expect(entity.emailLookup).toBe(customerLookup('email', entity.email));
        expect(entity.phoneLookup).toBeNull();
        subscriber.beforeUpdate({ entity: { status: 'CANCELLED' } } as any);
        subscriber.beforeUpdate({ entity: undefined } as any);
    });
});
