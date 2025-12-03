import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();
      console.log('[Auth] Attempting login for email:', normalizedEmail);
      
      const user = await this.usersService.findByEmail(normalizedEmail);
      if (!user) {
        console.log('[Auth] User not found:', normalizedEmail);
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('[Auth] User found:', user.id, user.email, user.role);

      if (!user.passwordHash) {
        console.log('[Auth] User missing passwordHash');
        throw new UnauthorizedException('Invalid user data');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      console.log('[Auth] Password valid:', isPasswordValid);
      
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const { passwordHash, ...result } = user;
      return result;
    } catch (error) {
      // Re-throw UnauthorizedException as-is
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Log and re-throw other errors
      console.error('[Auth] Error in validateUser:', error);
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

