import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Get('test-db')
  @ApiOperation({ summary: 'Test database connection and user lookup' })
  async testDb() {
    try {
      const email = 'patelmit101@gmail.com';
      const user = await this.usersService.findByEmail(email);
      return {
        success: true,
        userFound: !!user,
        user: user ? {
          id: user.id,
          email: user.email,
          role: user.role,
          hasPasswordHash: !!user.passwordHash,
          templeId: user.templeId,
        } : null,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  async login(@Request() req) {
    try {
      if (!req.user) {
        throw new Error('User not found in request');
      }
      return this.authService.login(req.user);
    } catch (error) {
      console.error('Error in login controller:', error);
      throw error;
    }
  }
}

