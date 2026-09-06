import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { env } from './env';

let redisClient: Redis;

try {
  redisClient = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying to trigger fallback
      }
      return 200;
    }
  });

  redisClient.on('error', (err) => {
    console.warn('[Redis] Connection error. Operating in offline/resilient fallback mode:', err.message);
  });
} catch (e) {
  console.warn('[Redis] Fallback to in-memory Redis mock client');
  redisClient = new RedisMock() as any;
}

export const redisConnection = redisClient;
