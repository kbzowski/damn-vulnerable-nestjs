import { Controller, Post, Body, HttpCode, HttpStatus, Request, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Registration failed' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      return {
        success: true,
        message: 'User registered successfully',
        user: result.user,
        token: result.token,
        debug: {
          timestamp: new Date().toISOString(),
          server: process.env.NODE_ENV,
          database: process.env.DATABASE_URL,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        sqlError: error.code || null,
        constraint: error.meta?.target || null,
      };
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.validateUser(loginDto.email, loginDto.password);

      if (!result) {
        const userExists = await this.authService.checkUserExists(loginDto.email);
        return {
          success: false,
          message: userExists ? 'Invalid password' : 'User not found',
          hint: userExists ? 'Try password reset?' : 'Maybe you need to register first?',
          attempts: await this.authService.getFailedAttempts(loginDto.email),
        };
      }

      return {
        success: true,
        message: 'Login successful',
        user: result.user,
        token: result.token,
        debug: {
          jwtSecret: process.env.JWT_SECRET,
          expiresIn: process.env.JWT_EXPIRES_IN,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        type: error.constructor.name,
        dbPath: error.message.includes('SQLITE') ? process.env.DATABASE_URL : null,
      };
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    const user = await this.authService.getUserById(req.user.userId);
    return {
      success: true,
      user: {
        ...user,
        password: user.password,
        internalId: user.id,
        dbMetadata: {
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      }
    };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  async resetPassword(@Body() body: { email: string }) {
    const newPassword = Math.random().toString(36).slice(-8);
    await this.authService.resetPassword(body.email, newPassword);

    return {
      success: true,
      message: 'Password reset successfully',
      newPassword: newPassword,
      hint: 'Login with this temporary password'
    };
  }
}