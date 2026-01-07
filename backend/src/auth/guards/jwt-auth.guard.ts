import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    console.log(`[JwtAuthGuard] Checking auth for ${request.method} ${request.path}`);
    
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      console.log(`[JwtAuthGuard] Route is public, allowing access`);
      return true;
    }
    
    console.log(`[JwtAuthGuard] Route requires authentication, validating JWT...`);
    try {
      const result = super.canActivate(context);
      console.log(`[JwtAuthGuard] JWT validation result:`, result);
      return result;
    } catch (error) {
      console.error(`[JwtAuthGuard] JWT validation error:`, error);
      throw error;
    }
  }
}

