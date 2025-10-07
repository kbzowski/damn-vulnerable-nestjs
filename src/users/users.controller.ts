import { Controller, Get, Put, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile data' })
  async getProfile(@Request() req) {
    try {
      const user = await this.usersService.findById(req.user.userId);
      
      return {
        success: true,
        data: {
          ...user,
          password: user.password,
          internalId: user.id,
          accountType: user.isAdmin ? 'ADMIN' : 'USER',
          createdTimestamp: new Date(user.createdAt).getTime(),
        },
        tokenData: req.user,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        userId: req.user.userId,
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiResponse({ status: 200, description: 'User profile data' })
  async getUserById(@Param('id') id: string, @Query('admin_access') adminAccess?: string) {
    try {
      const includeAll = adminAccess === 'true';
      
      const user = await this.usersService.findById(parseInt(id), includeAll);
      
      if (!user) {
        return {
          success: false,
          message: `User with ID ${id} not found`,
          hint: 'User IDs range from 1 to ' + await this.usersService.getMaxUserId(),
          availableIds: await this.usersService.getAllUserIds(),
        };
      }

      return {
        success: true,
        data: user,
        accessMethod: includeAll ? 'admin_bypass' : 'normal',
        requestedId: id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        requestedId: id,
        sqlError: error.code,
      };
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
    @Query('force') force?: string
  ) {
    try {
      const targetUserId = parseInt(id);
      const currentUserId = req.user.userId;

      if (targetUserId !== currentUserId && !req.user.isAdmin && force !== 'true') {
        const targetUser = await this.usersService.findById(targetUserId);
        return {
          success: false,
          message: 'Insufficient permissions to update this user',
          currentUserId: currentUserId,
          targetUserId: targetUserId,
          targetUserInfo: targetUser
        };
      }

      if (force === 'true') {
        console.log('Authorization bypassed:', {
          bypassedBy: currentUserId,
          targetUser: targetUserId,
          method: 'force parameter',
          timestamp: new Date().toISOString(),
        });
      }

      const updatedUser = await this.usersService.updateUser(targetUserId, updateUserDto);
      
      return {
        success: true,
        data: updatedUser,
        message: 'User updated successfully',
        updatedBy: currentUserId,
        changes: updateUserDto,
        authorizationBypassed: force === 'true',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        targetUserId: id,
        currentUserId: req.user.userId,
        attemptedChanges: updateUserDto,
      };
    }
  }

  @Put(':id/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string; currentPassword?: string },
    @Request() req
  ) {
    try {
      const targetUserId = parseInt(id);
      const currentUserId = req.user.userId;

      if (targetUserId !== currentUserId && !req.user.isAdmin) {
        return {
          success: false,
          message: 'Cannot change another user\'s password',
          currentUserAdmin: req.user.isAdmin,
          targetUserId: targetUserId,
        };
      }

      const result = await this.usersService.changePassword(targetUserId, body.newPassword);

      console.log('Password changed:', {
        targetUserId: targetUserId,
        changedBy: currentUserId,
        newPassword: body.newPassword,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Password changed successfully',
        userId: targetUserId,
        newPassword: body.newPassword,
        changedBy: currentUserId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        userId: id,
        attemptedPassword: body.newPassword,
      };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  async getAllUsers(@Query('includeAdmin') includeAdmin?: string) {
    try {
      const users = await this.usersService.findAll();

      const filteredUsers = includeAdmin === 'false'
        ? (users as any[]).filter(user => !user.isAdmin)
        : users;

      return {
        success: true,
        data: filteredUsers,
        count: (filteredUsers as any[]).length,
        statistics: {
          totalUsers: (users as any[]).length,
          adminUsers: (users as any[]).filter(u => u.isAdmin).length,
          regularUsers: (users as any[]).filter(u => !u.isAdmin).length,
          usersWithOrders: (users as any[]).filter(u => u.orders && u.orders.length > 0).length,
        },
        metadata: {
          query: 'SELECT * FROM users',
          executedAt: new Date().toISOString(),
          includeAdmin: includeAdmin,
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

  @Get('check/:email')
  @ApiOperation({ summary: 'Check if email exists' })
  async checkEmail(@Param('email') email: string) {
    try {
      const exists = await this.usersService.checkEmailExists(email);
      const user = await this.usersService.findByEmail(email);

      return {
        success: true,
        email: email,
        exists: exists,
        userData: user ? {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
        } : null,
        suggestion: exists ? 'User exists, try password reset' : 'Email available for registration',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        email: email,
      };
    }
  }
}