import app from './app';
import { env } from './config/env';
import { startEmailWorker } from './workers/email.worker';
import { elasticsearchService } from './services/elasticsearch.service';

const PORT = env.PORT || 5000;

async function bootstrap() {
  // 1. Initialize Elasticsearch index
  await elasticsearchService.initIndex();

  // 2. Start BullMQ Email Worker
  startEmailWorker();

  // 3. Start Express Web Server
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Email Scheduler Backend running on port ${PORT}`);
    console.log(`📊 Bull Board Dashboard: ${env.BACKEND_URL}/admin/queues`);
    console.log(`====================================================`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error during backend bootstrapping:', err);
});
