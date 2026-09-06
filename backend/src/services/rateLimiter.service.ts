import { redisConnection } from '../config/redis';
import { env } from '../config/env';

export class RateLimiterService {
  /**
   * Atomically checks and increments the hourly rate limit counter for a sender.
   * Returns { allowed: true, currentCount } if under limit, or { allowed: false, currentCount, nextWindowStart } if exceeded.
   */
  async checkAndIncrement(senderId: string, maxLimit: number = env.MAX_EMAILS_PER_HOUR_PER_SENDER): Promise<{
    allowed: boolean;
    currentCount: number;
    nextWindowDelayMs: number;
    hourKey: string;
  }> {
    const now = new Date();
    // Format YYYY-MM-DD-HH
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');
    const hourKey = `email_rate:${senderId}:${year}-${month}-${day}-${hour}`;

    // Redis Lua script for atomic check-and-increment
    const luaScript = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], 7200)
      end
      return current
    `;

    const count = (await redisConnection.eval(luaScript, 1, hourKey)) as number;

    // Calculate start of next UTC hour
    const nextHour = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours() + 1,
      0, 0, 0
    ));
    const nextWindowDelayMs = Math.max(1000, nextHour.getTime() - now.getTime());

    if (count > maxLimit) {
      return {
        allowed: false,
        currentCount: count,
        nextWindowDelayMs,
        hourKey
      };
    }

    return {
      allowed: true,
      currentCount: count,
      nextWindowDelayMs: 0,
      hourKey
    };
  }
}

export const rateLimiterService = new RateLimiterService();
