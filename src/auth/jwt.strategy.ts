import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error(' CRÍTICO: JWT_SECRET no está configurado');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });

    this.logger.log(
      ` JwtStrategy inicializado. Secret: ${secret.substring(0, 3)}***`,
    );
  }

  validate(payload: { sub: string; username: string; full_handle: string }) {
    this.logger.log(
      ` Token validado para: ${payload.username} (${payload.full_handle})`,
    );

    if (!payload.sub || !payload.username || !payload.full_handle) {
      throw new UnauthorizedException(
        ' Token inválido: faltan datos requeridos (sub, username, full_handle)',
      );
    }

    // Esto es lo que se inyecta en req.user
    return {
      id: payload.sub,
      username: payload.username,
      full_handle: payload.full_handle,
    };
  }
}
