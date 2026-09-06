import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const QUEUE_NAME = 'emailQueue';

export const emailQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 86400, // keep for 24h
      count: 10000
    },
    removeOnFail: {
      age: 604800 // keep failed for 7 days
    }
  }
});
