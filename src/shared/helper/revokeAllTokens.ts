import Redis from 'ioredis';

export async function revokeAllTokens(redis: Redis, userId: string): Promise<void> {
    const stream = redis.scanStream({
        match: `whitelist:${userId}:*`,
        count: 100,
    });

    for await (const chunk of stream) {
        const keys = chunk as string[];

        if (keys.length > 0) {
            const pipeline = redis.pipeline();
            keys.forEach((key) => pipeline.unlink(key));
            await pipeline.exec();
        }
    }
}
