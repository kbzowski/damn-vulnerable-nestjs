import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard, AdminGuard } from './jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminGuard],
  exports: [AuthService, JwtAuthGuard, AdminGuard],
})
export class AuthModule {}