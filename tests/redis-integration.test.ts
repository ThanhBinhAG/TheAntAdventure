import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from 'redis';

test('Redis kết nối, lưu, đọc và hết hạn đúng', async (context) => {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        context.skip('REDIS_URL chưa được cấu hình');
        return;
    }

    const client = createClient({ url: redisUrl });
    const key = `test:redis:${process.pid}:${Date.now()}`;

    await client.connect();

    try {
        assert.equal(await client.ping(), 'PONG');

        await client.set(key, 'ok', { EX: 10 });

        assert.equal(await client.get(key), 'ok');

        const ttl = await client.ttl(key);
        assert.ok(ttl > 0 && ttl <= 10);
    } finally {
        await client.del(key);

        if (client.isOpen) {
            await client.quit();
        }
    }
});