import { prisma } from '../config/prisma';

export class SlackRepository {
  async findByUserId(userId: string) {
    return prisma.slackConnection.findUnique({
      where: { userId }
    });
  }

  async upsertConnection(data: {
    userId: string;
    slackUserId: string;
    teamId: string;
    teamName?: string;
    accessToken: string;
    botAccessToken?: string;
    channelId?: string;
  }) {
    return prisma.slackConnection.upsert({
      where: { userId: data.userId },
      update: {
        slackUserId: data.slackUserId,
        teamId: data.teamId,
        teamName: data.teamName,
        accessToken: data.accessToken,
        botAccessToken: data.botAccessToken,
        channelId: data.channelId
      },
      create: {
        userId: data.userId,
        slackUserId: data.slackUserId,
        teamId: data.teamId,
        teamName: data.teamName,
        accessToken: data.accessToken,
        botAccessToken: data.botAccessToken,
        channelId: data.channelId
      }
    });
  }

  async deleteConnection(userId: string) {
    return prisma.slackConnection.deleteMany({
      where: { userId }
    });
  }
}

export const slackRepository = new SlackRepository();
