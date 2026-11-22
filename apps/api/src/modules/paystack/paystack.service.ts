import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const PAYSTACK_BASE = 'https://api.paystack.co';

@Injectable()
export class PaystackService {
  private readonly secretKey: string;

  constructor(private readonly config: ConfigService) {
    this.secretKey = config.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  private get headers() {
    return { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' };
  }

  /** Initialize a transaction and return the authorization_url */
  async initialize(email: string, amountKobo: number, reference: string, metadata?: object) {
    if (!this.secretKey) throw new BadRequestException('Paystack not configured');
    const { data } = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      { email, amount: amountKobo, reference, metadata },
      { headers: this.headers },
    );
    if (!data.status) throw new BadRequestException(data.message);
    return data.data as { authorization_url: string; access_code: string; reference: string };
  }

  /** Verify a transaction by reference */
  async verify(reference: string) {
    if (!this.secretKey) throw new BadRequestException('Paystack not configured');
    const { data } = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, { headers: this.headers });
    if (!data.status) throw new BadRequestException(data.message);
    return data.data as { status: string; amount: number; currency: string; reference: string; gateway_response: string };
  }
}
