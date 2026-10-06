import { MigrationInterface, QueryRunner } from 'typeorm';
import {
    customerEncryptionKey,
    customerLookup,
    decryptCustomerValue,
    encryptCustomerValue,
} from '../customer-encryption';

export class EncryptOrderCustomers20261006000000 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        customerEncryptionKey();
        await this.useSchema(queryRunner);
        await queryRunner.query(`ALTER TABLE orders
            ALTER COLUMN email TYPE text,
            ALTER COLUMN full_name TYPE text,
            ALTER COLUMN phone TYPE text,
            ADD COLUMN email_lookup varchar(64),
            ADD COLUMN phone_lookup varchar(64)`);
        await this.rewrite(queryRunner, true);
        await queryRunner.query('CREATE INDEX orders_email_lookup_idx ON orders (email_lookup)');
        await queryRunner.query('CREATE INDEX orders_phone_lookup_idx ON orders (phone_lookup)');
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        customerEncryptionKey();
        await this.useSchema(queryRunner);
        await queryRunner.query('LOCK TABLE orders IN ACCESS EXCLUSIVE MODE');
        await this.rewrite(queryRunner, false);
        // Keep text columns: rollback must not truncate names/contact details added since migration.
        await queryRunner.query(
            'ALTER TABLE orders DROP COLUMN email_lookup, DROP COLUMN phone_lookup',
        );
    }

    private async useSchema(queryRunner: QueryRunner): Promise<void> {
        if (!queryRunner.isTransactionActive) {
            throw new Error('Customer encryption migration requires a transaction');
        }
        const schema = (queryRunner.connection.options as { schema?: string }).schema;
        if (schema) {
            await queryRunner.query(`SET LOCAL search_path TO "${schema.replaceAll('"', '""')}"`);
        }
    }

    private async rewrite(queryRunner: QueryRunner, encrypt: boolean): Promise<void> {
        let lastId: string | null = null;
        for (;;) {
            const rows: Array<{
                id: string;
                email: string | null;
                full_name: string | null;
                phone: string | null;
                shipping_address: unknown;
                note: string | null;
            }> = await queryRunner.query(
                `SELECT id, email, full_name, phone, shipping_address, note FROM orders
                 WHERE ($1::uuid IS NULL OR id > $1::uuid) ORDER BY id LIMIT 500`,
                [lastId],
            );
            if (!rows.length) {
                break;
            }
            for (const row of rows) {
                const transform = encrypt ? encryptCustomerValue : decryptCustomerValue;
                const values = (
                    ['email', 'full_name', 'phone', 'shipping_address', 'note'] as const
                ).map((field) => transform(field, row[field]));
                // jsonb stores the encrypted envelope as a JSON string, preserving the column type.
                values[3] = JSON.stringify(values[3]);
                const lookups = encrypt ? ', email_lookup = $7, phone_lookup = $8' : '';
                await queryRunner.query(
                    `UPDATE orders SET email = $2, full_name = $3, phone = $4,
                     shipping_address = $5::jsonb, note = $6${lookups} WHERE id = $1`,
                    [
                        row.id,
                        ...values,
                        ...(encrypt
                            ? [
                                  customerLookup('email', row.email),
                                  customerLookup('phone', row.phone),
                              ]
                            : []),
                    ],
                );
            }
            lastId = rows[rows.length - 1].id;
        }
    }
}
