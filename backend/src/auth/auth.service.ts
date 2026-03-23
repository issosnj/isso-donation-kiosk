import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AppLogger } from '../common/logger/app-logger.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private logger: AppLogger,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await this.usersService.findByEmail(normalizedEmail);
      if (!user) {
        this.logger.warn('Auth login failed: user not found', { email: normalizedEmail });
        throw new UnauthorizedException('Invalid credentials');
      }
      if (!user.passwordHash) {
        this.logger.warn('Auth login failed: missing password hash', { userId: user.id });
        throw new UnauthorizedException('Invalid user data');
      }
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        this.logger.warn('Auth login failed: invalid password', { email: normalizedEmail });
        throw new UnauthorizedException('Invalid credentials');
      }
      this.logger.log('Auth login success', { userId: user.id, email: normalizedEmail });
      const { passwordHash, ...result } = user;
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Auth validateUser error', (error as Error).stack, { email: email?.substring(0, 3) + '***' });
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      templeId: user.templeId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        templeId: user.templeId,
      },
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

