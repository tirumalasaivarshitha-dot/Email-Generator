import { WebClient } from '@slack/web-api';
import axios from 'axios';
import { slackRepository } from '../repositories/slack.repository';
import { redisConnection } from '../config/redis';
import { env } from '../config/env';

export class SlackService {
  async getConnectUrl(userId: string) {
    const scopes = ['chat:write', 'channels:read', 'chat:write.public'];
    const redirectUri = encodeURIComponent(env.SLACK_REDIRECT_URI);
    const scopeStr = encodeURIComponent(scopes.join(' '));
    return `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=${scopeStr}&redirect_uri=${redirectUri}&state=${userId}`;
  }

  async handleCallback(code: string, userId: string) {
    try {
      const response = await axios.post(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: env.SLACK_CLIENT_ID,
          client_secret: env.SLACK_CLIENT_SECRET,
          code,
          redirect_uri: env.SLACK_REDIRECT_URI
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      const data = response.data;
      if (!data.ok) {
        throw new Error(`Slack OAuth error: ${data.error}`);
      }

      const botAccessToken = data.access_token;
      const teamId = data.team?.id || '';
      const teamName = data.team?.name || 'Slack Workspace';
      const slackUserId = data.authed_user?.id || '';
      const channelId = data.incoming_webhook?.channel_id || null;

      await slackRepository.upsertConnection({
        userId,
        slackUserId,
        teamId,
        teamName,
        accessToken: data.access_token,
        botAccessToken,
        channelId
      });

      return { success: true, teamName };
    } catch (err) {
      console.error('[SlackService] Callback error:', err);
      throw err;
    }
  }

  async disconnect(userId: string) {
    return slackRepository.deleteConnection(userId);
  }

  async notifyRateLimitReached(params: {
    userId: string;
    senderId: string;
    senderEmail: string;
    hourlyLimit: number;
  }) {
    const { userId, senderId, senderEmail, hourlyLimit } = params;

    // Check if Slack is connected for this user
    const slackConn = await slackRepository.findByUserId(userId);
    if (!slackConn || (!slackConn.botAccessToken && !slackConn.accessToken)) {
      // Slack not connected; do nothing and don't crash
      return;
    }

    // Redis deduplication check: 1 notification per sender per hourly window
    const dateHourStr = new Date().toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
    const dedupKey = `slack_notif:${senderId}:${dateHourStr}`;

    const setNxResult = await redisConnection.set(dedupKey, '1', 'EX', 3600, 'NX');
    if (!setNxResult) {
      // Already sent notification for this sender in this hour window
      return;
    }

    const messageText = `⚠️ Rate limit reached for sender *${senderEmail}*.\nHourly limit: *${hourlyLimit}*.\nRemaining jobs are being delayed to the next available hour.`;

    try {
      const client = new WebClient(slackConn.botAccessToken || slackConn.accessToken);
      
      // If channelId is stored use it, otherwise post to first accessible public channel
      let targetChannel = slackConn.channelId;
      if (!targetChannel) {
        const conversations = await client.conversations.list({ types: 'public_channel,private_channel' });
        if (conversations.channels && conversations.channels.length > 0) {
          targetChannel = conversations.channels[0].id || null;
        }
      }

      if (targetChannel) {
        await client.chat.postMessage({
          channel: targetChannel,
          text: messageText,
          mrkdwn: true
        });
        console.log(`[SlackService] Rate limit notification sent to channel ${targetChannel} for sender ${senderEmail}`);
      }
    } catch (err) {
      console.error('[SlackService] Error sending Slack rate limit notification:', (err as Error).message);
    }
  }
}

export const slackService = new SlackService();
