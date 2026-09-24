import { Client } from 'pg';

export async function createSchema(connectionString: string, schema: string): Promise<void> {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        await client.query(`CREATE SCHEMA "${schema}"`);
    } finally {
        await client.end();
    }
}

export async function dropSchema(connectionString: string, schema: string): Promise<void> {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
        await client.end();
    }
}

export async function inSchema(
    connectionString: string,
    schema: string,
    callback: (client: Client) => Promise<void>,
): Promise<void> {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        await client.query(`SET search_path TO "${schema}"`);
        await callback(client);
    } finally {
        await client.end();
    }
}
