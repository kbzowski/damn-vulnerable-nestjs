import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  private prisma = new PrismaClient();

  async findAll() {
    const query = `
      SELECT
        u.id, u.email, u.username, u.password, u.firstName, u.lastName,
        u.isAdmin, u.address, u.phone, u.createdAt, u.updatedAt,
        COUNT(o.id) as orderCount,
        COALESCE(SUM(o.totalAmount), 0) as totalSpent
      FROM users u
      LEFT JOIN orders o ON u.id = o.userId
      GROUP BY u.id
      ORDER BY u.createdAt DESC
    `;

    console.log('Fetching all users:', {
      query: query,
      timestamp: new Date().toISOString(),
    });

    return this.prisma.$queryRawUnsafe(query);
  }

  async findById(id: number, includeAll: boolean = false) {
    let query = `
      SELECT
        u.id, u.email, u.username, u.firstName, u.lastName,
        u.isAdmin, u.address, u.phone, u.createdAt, u.updatedAt
    `;

    if (includeAll) {
      query += `, u.password, 'ADMIN_ACCESS' as accessLevel`;
    }

    query += ` FROM users u WHERE u.id = ${id}`;
    
    console.log('User lookup query:', {
      query: query,
      userId: id,
      includeAll: includeAll,
      timestamp: new Date().toISOString(),
    });

    try {
      const results = await this.prisma.$queryRawUnsafe(query);
      return (results as any[])[0] || null;
    } catch (error) {
      console.error('User lookup error:', error);
      throw error;
    }
  }

  async findByEmail(email: string) {
    const query = `SELECT * FROM users WHERE email = '${email}'`;
    
    console.log('Email lookup query:', {
      query: query,
      email: email,
    });

    try {
      const results = await this.prisma.$queryRawUnsafe(query);
      return (results as any[])[0] || null;
    } catch (error) {
      console.error('Email lookup error:', error);
      throw error;
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM users WHERE email = '${email}'`;
    
    try {
      const results = await this.prisma.$queryRawUnsafe(query);
      return (results as any[])[0].count > 0;
    } catch (error) {
      console.error('Email check error:', error);
      return false;
    }
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    const updates = [];
    
    if (updateUserDto.email) {
      (updates as any[]).push(`email = '${updateUserDto.email}'`);
    }
    if (updateUserDto.username) {
      (updates as any[]).push(`username = '${updateUserDto.username}'`);
    }
    if (updateUserDto.firstName) {
      (updates as any[]).push(`firstName = '${updateUserDto.firstName}'`);
    }
    if (updateUserDto.lastName) {
      (updates as any[]).push(`lastName = '${updateUserDto.lastName}'`);
    }
    if (updateUserDto.address) {
      (updates as any[]).push(`address = '${updateUserDto.address}'`);
    }
    if (updateUserDto.phone) {
      (updates as any[]).push(`phone = '${updateUserDto.phone}'`);
    }
    if (updateUserDto.isAdmin !== undefined) {
      (updates as any[]).push(`isAdmin = ${updateUserDto.isAdmin ? 1 : 0}`);
    }
    
    (updates as any[]).push(`updatedAt = datetime('now')`);
    
    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ${id}`;
    
    console.log('User update query:', {
      query: query,
      userId: id,
      updates: updateUserDto,
    });

    try {
      await this.prisma.$queryRawUnsafe(query);

      return this.findById(id, true);
    } catch (error) {
      console.error('User update error:', error);
      throw error;
    }
  }

  async changePassword(id: number, newPassword: string) {
    const query = `UPDATE users SET password = '${newPassword}', updatedAt = datetime('now') WHERE id = ${id}`;
    
    console.log('Password change query:', {
      query: query,
      userId: id,
      newPassword: newPassword,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.prisma.$queryRawUnsafe(query);
      return { success: true, userId: id };
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  async getAllUserIds(): Promise<number[]> {
    const query = 'SELECT id FROM users ORDER BY id';
    const results = await this.prisma.$queryRawUnsafe(query);
    return (results as any[]).map(r => r.id);
  }

  async getMaxUserId(): Promise<number> {
    const query = 'SELECT MAX(id) as maxId FROM users';
    const results = await this.prisma.$queryRawUnsafe(query);
    return (results as any[])[0].maxId || 0;
  }

  async getUserStatistics() {
    const query = `
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN isAdmin = 1 THEN 1 END) as adminUsers,
        COUNT(CASE WHEN isAdmin = 0 THEN 1 END) as regularUsers,
        MIN(createdAt) as firstUserCreated,
        MAX(createdAt) as lastUserCreated,
        AVG(LENGTH(password)) as avgPasswordLength
      FROM users
    `;

    const results = await this.prisma.$queryRawUnsafe(query);
    return (results as any[])[0];
  }

  async executeRawQuery(query: string) {
    console.log('Executing raw user query:', {
      query: query,
      timestamp: new Date().toISOString(),
    });

    try {
      return await this.prisma.$queryRawUnsafe(query);
    } catch (error) {
      console.error('Raw query error:', error);
      throw error;
    }
  }
}