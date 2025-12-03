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
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.passwordHash) {
        throw new UnauthorizedException('Invalid user data');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
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
      console.error('Error in validateUser:', error);
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

