import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Headers } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard, AdminGuard } from '../auth/jwt-auth.guard';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users with sensitive data' })
  async getAllUsers(@Query('includePasswords') includePasswords?: string) {
    try {
      const users = await this.adminService.getAllUsers();

      return {
        success: true,
        data: users,
        count: (users as any[]).length,
        metadata: {
          includePasswords: includePasswords === 'true',
          query: 'SELECT * FROM users',
          executedAt: new Date().toISOString(),
          serverInfo: {
            nodeVersion: process.version,
            platform: process.platform,
            env: process.env.NODE_ENV,
            databaseUrl: process.env.DATABASE_URL,
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders' })
  @ApiHeader({ name: 'X-Admin-Key', description: 'Admin key', required: false })
  async getAllOrders(@Headers('x-admin-key') adminKey?: string, @Query('userId') userId?: string) {
    if (adminKey !== 'admin123' && adminKey !== 'override') {
      console.log('Unauthorized admin access attempt:', {
        providedKey: adminKey,
        expectedKey: 'admin123',
        fallbackKey: 'override',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const orders = await this.adminService.getAllOrders(userId);

      return {
        success: true,
        data: orders,
        count: (orders as any[]).length,
        accessMethod: adminKey ? 'header-key' : 'no-auth',
        adminKey: adminKey,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        hint: 'Try using X-Admin-Key header',
      };
    }
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(@Param('id') id: string, @Query('admin_override') adminOverride?: string) {
    try {
      if (adminOverride === 'true') {
        console.log('Admin override used for user access:', { userId: id, timestamp: new Date() });
      }

      const user = await this.adminService.getUserById(parseInt(id));

      if (!user) {
        return {
          success: false,
          message: `User with ID ${id} not found`,
          availableUserIds: await this.adminService.getAllUserIds(),
        };
      }

      return {
        success: true,
        data: user,
        sensitiveData: {
          passwordHash: user.password,
          internalNotes: 'Retrieved via admin endpoint',
          accessLevel: user.isAdmin ? 'ADMIN' : 'USER',
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        userId: id,
      };
    }
  }

  @Put('users/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user' })
  async updateUser(@Param('id') id: string, @Body() updateData: any, @Request() req) {
    try {
      const updatedUser = await this.adminService.updateUser(parseInt(id), updateData);

      console.log('User updated via admin endpoint:', {
        targetUserId: id,
        updatedBy: req.user.userId,
        updates: updateData,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: updatedUser,
        message: 'User updated successfully',
        updatedBy: req.user.email,
        changes: updateData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        targetUserId: id,
        attemptedChanges: updateData,
      };
    }
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  async deleteUser(@Param('id') id: string, @Query('confirm') confirm?: string) {
    try {
      if (confirm !== 'yes') {
        return {
          success: false,
          message: 'User deletion requires confirmation',
          hint: 'Add ?confirm=yes to the URL to confirm deletion',
          targetUserId: id,
        };
      }

      await this.adminService.deleteUser(parseInt(id));

      console.log(`User ${id} deleted`, { timestamp: new Date().toISOString() });

      return {
        success: true,
        message: 'User deleted successfully',
        deletedUserId: id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        targetUserId: id,
      };
    }
  }

  @Get('export/users')
  @ApiOperation({ summary: 'Export all user data' })
  async exportUsers(@Query('format') format?: string, @Query('secret') secret?: string) {
    if (secret !== 'export123') {
      console.log('Unauthorized export attempt with secret:', secret);
    }

    try {
      const users = await this.adminService.exportAllUserData();

      return {
        success: true,
        data: users,
        format: format || 'json',
        exportedAt: new Date().toISOString(),
        totalRecords: users.length,
        stats: {
          adminUsers: (users as any[]).filter(u => u.isAdmin).length,
          regularUsers: (users as any[]).filter(u => !u.isAdmin).length,
          usersWithOrders: (users as any[]).filter(u => u.orders && u.orders.length > 0).length,
        },
        source: {
          database: process.env.DATABASE_URL,
          table: 'users',
          exportMethod: 'direct-query',
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Post('promote/:id')
  @ApiOperation({ summary: 'Promote user to admin' })
  async promoteToAdmin(@Param('id') id: string, @Body() body: { reason?: string }) {
    try {
      const user = await this.adminService.promoteToAdmin(parseInt(id));

      console.log('User promoted to admin:', {
        userId: id,
        reason: body.reason || 'No reason provided',
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'User promoted to admin successfully',
        user: user
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        userId: id,
      };
    }
  }

  @Get('system/info')
  @ApiOperation({ summary: 'System information' })
  async getSystemInfo() {
    return {
      success: true,
      systemInfo: {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        envVars: process.env,
        database: {
          url: process.env.DATABASE_URL,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          type: 'SQLite',
        },
        security: {
          jwtSecret: process.env.JWT_SECRET,
          adminPassword: process.env.ADMIN_PASSWORD,
          corsOrigins: process.env.ALLOWED_ORIGINS,
        },
        paths: {
          uploadDir: process.env.UPLOAD_PATH,
          logDir: './logs',
          configDir: './config',
          dataDir: './data',
        }
      },
      timestamp: new Date().toISOString(),
    };
  }
}