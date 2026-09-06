import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export class MailerService {
  private transporterPromise: Promise<Transporter>;

  constructor() {
    this.transporterPromise = this.initTransporter();
  }

  private async initTransporter(): Promise<Transporter> {
    if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
      return nodemailer.createTransport({
        host: env.ETHEREAL_HOST,
        port: env.ETHEREAL_PORT,
        secure: false,
        auth: {
          user: env.ETHEREAL_USER,
          pass: env.ETHEREAL_PASS
        }
      });
    }

    // Fallback: Generate Ethereal test account automatically
    console.log('[Mailer] Creating dynamic Ethereal Email test account...');
    const testAccount = await nodemailer.createTestAccount();
    console.log(`[Mailer] Dynamic Ethereal account ready: ${testAccount.user}`);

    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  async sendMail(params: {
    fromName: string;
    fromEmail: string;
    to: string;
    subject: string;
    body: string;
  }) {
    const transporter = await this.transporterPromise;
    const info = await transporter.sendMail({
      from: `"${params.fromName}" <${params.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: `<div style="font-family: sans-serif; padding: 16px; color: #333;">
              <h2>${params.subject}</h2>
              <div style="line-height: 1.6; white-space: pre-wrap;">${params.body}</div>
             </div>`
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Mailer] Ethereal Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl
    };
  }
}

export const mailerService = new MailerService();
