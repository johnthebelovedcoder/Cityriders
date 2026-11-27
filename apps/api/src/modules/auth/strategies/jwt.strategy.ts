import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import type { JwtPayload } from '@cityrider/types';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Read current account state and role on every request so deactivation or
    // a role change takes effect immediately instead of waiting for token expiry.
    const [user] = await this.prisma.$queryRaw<Array<{ id: string; email: string; role: string; status: string; customerId: string | null }>>`
      SELECT "id", "email", "role"::text AS "role", "status"::text AS "status", "customerId" FROM "users" WHERE "id" = ${payload.sub} LIMIT 1
    `;
    if (!user || user.status !== 'ACTIVE') return null;
    return { id: user.id, email: user.email, role: user.role, customerId: user.customerId };
  }
}
