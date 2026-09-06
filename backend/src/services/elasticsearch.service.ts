import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env';

export class ElasticsearchService {
  private client: Client;
  public readonly indexName = 'email_jobs';

  constructor() {
    this.client = new Client({
      node: env.ELASTICSEARCH_NODE
    });
  }

  async initIndex() {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                userId: { type: 'keyword' },
                senderEmail: { type: 'keyword' },
                recipientEmail: { type: 'keyword' },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                createdAt: { type: 'date' }
              }
            }
          }
        });
        console.log(`[Elasticsearch] Index '${this.indexName}' created successfully`);
      }
    } catch (err) {
      console.warn('[Elasticsearch] Could not initialize index (Elasticsearch server may be unavailable or connecting):', (err as Error).message);
    }
  }

  async indexEmailJob(job: {
    id: string;
    userId: string;
    senderEmail: string;
    recipientEmail: string;
    subject: string;
    body: string;
    status: string;
    scheduledAt: Date;
    sentAt?: Date | null;
    createdAt?: Date;
  }) {
    try {
      await this.client.index({
        index: this.indexName,
        id: job.id,
        document: {
          id: job.id,
          userId: job.userId,
          senderEmail: job.senderEmail,
          recipientEmail: job.recipientEmail,
          subject: job.subject,
          body: job.body,
          status: job.status,
          scheduledAt: job.scheduledAt.toISOString(),
          sentAt: job.sentAt ? job.sentAt.toISOString() : null,
          createdAt: job.createdAt ? job.createdAt.toISOString() : new Date().toISOString()
        }
      });
    } catch (err) {
      console.warn(`[Elasticsearch] Failed to index email job ${job.id}:`, (err as Error).message);
    }
  }

  async searchEmailJobs(userId: string, queryText?: string, statusFilter?: string) {
    try {
      const mustClauses: any[] = [{ term: { userId } }];

      if (statusFilter && statusFilter !== 'all') {
        mustClauses.push({ term: { status: statusFilter } });
      }

      if (queryText && queryText.trim()) {
        mustClauses.push({
          multi_match: {
            query: queryText.trim(),
            fields: ['recipientEmail', 'senderEmail', 'subject', 'body', 'status'],
            fuzziness: 'AUTO'
          }
        });
      }

      const response = await this.client.search({
        index: this.indexName,
        body: {
          query: {
            bool: {
              must: mustClauses
            }
          },
          sort: [{ scheduledAt: { order: 'desc' } }]
        }
      });

      return response.hits.hits.map((hit: any) => hit._source);
    } catch (err) {
      console.warn('[Elasticsearch] Search query failed, falling back to DB search:', (err as Error).message);
      return null; // Return null so caller can fall back to PostgreSQL DB
    }
  }
}

export const elasticsearchService = new ElasticsearchService();
