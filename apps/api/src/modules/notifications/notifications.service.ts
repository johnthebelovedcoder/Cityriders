import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly smsApiKey: string;
  private readonly smsUsername: string;
  private emailTransporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.smsApiKey = config.get<string>('AFRICASTALKING_API_KEY', '');
    this.smsUsername = config.get<string>('AFRICASTALKING_USERNAME', 'sandbox');

    const smtpHost = config.get<string>('SMTP_HOST', '');
    if (smtpHost) {
      this.emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: config.get<number>('SMTP_PORT', 587),
        secure: false,
        auth: {
          user: config.get<string>('SMTP_USER', ''),
          pass: config.get<string>('SMTP_PASS', ''),
        },
      });
    }
  }

  get isSmsConfigured() {
    return Boolean(this.smsApiKey);
  }

  get isEmailConfigured() {
    return Boolean(this.emailTransporter);
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    if (!this.isSmsConfigured) {
      this.logger.debug(`[SMS mock] To: ${to} | ${message}`);
      return true;
    }
    try {
      const sandbox = this.smsUsername === 'sandbox';
      const baseUrl = sandbox
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';

      const body = new URLSearchParams({ username: this.smsUsername, to, message }).toString();
      await axios.post(baseUrl, body, {
        headers: {
          apiKey: this.smsApiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      });
      return true;
    } catch (err: any) {
      this.logger.error(`SMS send failed: ${err?.message}`);
      return false;
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.isEmailConfigured) {
      this.logger.debug(`[Email mock] To: ${to} | Subject: ${subject}`);
      return true;
    }
    try {
      const from = this.config.get<string>('SMTP_FROM', 'noreply@cityrider.com');
      await this.emailTransporter!.sendMail({ from, to, subject, html });
      return true;
    } catch (err: any) {
      this.logger.error(`Email send failed: ${err?.message}`);
      return false;
    }
  }

  async notifyPackageIntake(recipientPhone: string, recipientEmail: string | null | undefined, trackingNumber: string, appUrl: string) {
    const trackingUrl = `${appUrl}/track/${trackingNumber}`;
    const smsMessage = `Your package ${trackingNumber} has been booked with CityRider. Track it live: ${trackingUrl}`;

    await this.sendSms(recipientPhone, smsMessage);

    if (recipientEmail) {
      await this.sendEmail(
        recipientEmail,
        `Booking confirmed — ${trackingNumber}`,
        this.emailHtml({
          heading: 'Booking Confirmed',
          body: `Your package has been received and is being processed. We'll notify you as it moves through each stage.`,
          trackingNumber,
          trackingUrl,
          cta: 'Track your package',
        }),
      );
    }
  }

  async notifyPackageStatus(phone: string, email: string | null | undefined, trackingNumber: string, status: string, appUrl?: string) {
    const trackingUrl = appUrl ? `${appUrl}/track/${trackingNumber}` : null;

    const statusConfig: Record<string, { sms: string; subject: string; heading: string; body: string }> = {
      ASSIGNED: {
        sms: `Your package ${trackingNumber} has been assigned to a rider and will be picked up soon.`,
        subject: `Rider assigned — ${trackingNumber}`,
        heading: 'Rider Assigned',
        body: 'A rider has been assigned to your package and will collect it from the sender shortly.',
      },
      PICKED_UP: {
        sms: `Your package ${trackingNumber} has been picked up and is on its way.${trackingUrl ? ` Track: ${trackingUrl}` : ''}`,
        subject: `Package picked up — ${trackingNumber}`,
        heading: 'Package Picked Up',
        body: 'Your package has been collected from the sender and is heading your way.',
      },
      IN_TRANSIT: {
        sms: `Your package ${trackingNumber} is out for delivery and should arrive today.${trackingUrl ? ` Track: ${trackingUrl}` : ''}`,
        subject: `Out for delivery — ${trackingNumber}`,
        heading: 'Out for Delivery',
        body: 'Your package is on its way to you and should arrive today. Keep your phone handy!',
      },
      OUT_FOR_DELIVERY: {
        sms: `Your package ${trackingNumber} is out for delivery and should arrive today.${trackingUrl ? ` Track: ${trackingUrl}` : ''}`,
        subject: `Out for delivery — ${trackingNumber}`,
        heading: 'Out for Delivery',
        body: 'Your package is on its way to you and should arrive today. Keep your phone handy!',
      },
      DELIVERED: {
        sms: `Your package ${trackingNumber} has been delivered successfully. Thank you for choosing CityRider!`,
        subject: `Delivered — ${trackingNumber}`,
        heading: 'Package Delivered',
        body: 'Your package has been successfully delivered. We hope everything arrived in perfect condition!',
      },
      DELIVERY_ATTEMPTED: {
        sms: `We attempted delivery of ${trackingNumber} but couldn't reach you. Visit your tracking page to request a new date.${trackingUrl ? ` ${trackingUrl}` : ''}`,
        subject: `Delivery attempted — ${trackingNumber}`,
        heading: 'Delivery Attempted',
        body: 'We tried to deliver your package but were unable to reach you. You can request a new delivery date from your tracking page.',
      },
      RETURNED: {
        sms: `Your package ${trackingNumber} is being returned. Please contact us for details.`,
        subject: `Package returned — ${trackingNumber}`,
        heading: 'Package Returned',
        body: 'Your package is being returned to the sender. Please contact us or the sender for further assistance.',
      },
    };

    const cfg = statusConfig[status];
    if (!cfg) return;

    await this.sendSms(phone, cfg.sms);
    if (email) {
      await this.sendEmail(
        email,
        cfg.subject,
        this.emailHtml({ heading: cfg.heading, body: cfg.body, trackingNumber, trackingUrl: trackingUrl ?? undefined, cta: 'Track your package' }),
      );
    }
  }

  private emailHtml(opts: { heading: string; body: string; trackingNumber: string; trackingUrl?: string; cta: string }) {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f5f5f5;margin:0;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:#AE1805;padding:24px 32px">
    <span style="color:#FFB217;font-weight:900;font-size:20px;letter-spacing:-0.5px">CityRider</span>
    <span style="color:#D8CFC4;font-size:11px;margin-left:8px;text-transform:uppercase;letter-spacing:2px">Logistics</span>
  </div>
  <div style="padding:32px">
    <h2 style="margin:0 0 12px;font-size:22px;color:#1a1a1a">${opts.heading}</h2>
    <p style="margin:0 0 20px;color:#555;line-height:1.6">${opts.body}</p>
    <div style="background:#f9f9f9;border:1px solid #e5e5e5;border-radius:6px;padding:12px 16px;margin-bottom:24px">
      <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px">Tracking number</span><br>
      <strong style="font-family:monospace;font-size:16px;color:#1a1a1a">${opts.trackingNumber}</strong>
    </div>
    ${opts.trackingUrl ? `<a href="${opts.trackingUrl}" style="display:inline-block;background:#AE1805;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:6px">${opts.cta} →</a>` : ''}
  </div>
  <div style="padding:16px 32px;border-top:1px solid #f0f0f0;font-size:12px;color:#aaa">
    © ${new Date().getFullYear()} CityRider Logistics · Questions? Reply to this email.
  </div>
</div>
</body></html>`;
  }
}
