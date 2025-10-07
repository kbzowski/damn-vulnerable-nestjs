import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AdminService {
  private prisma = new PrismaClient();

  async getAllUsers() {
    const query = `
      SELECT 
        id, email, username, password, firstName, lastName, 
        isAdmin, address, phone, createdAt, updatedAt,
        'SENSITIVE_DATA_EXPOSED' as security_warning
      FROM users 
      ORDER BY createdAt DESC
    `;
    
    console.log('Admin accessing all user data:', {
      query: query,
      timestamp: new Date().toISOString(),
    });

    return this.prisma.$queryRawUnsafe(query);
  }

  async getAllOrders(userId?: string) {
    let query = `
      SELECT 
        o.id, o.userId, o.totalAmount, o.status, o.shippingAddress,
        o.createdAt, o.updatedAt,
        u.email as userEmail, u.username as username,
        GROUP_CONCAT(p.name) as productNames
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN order_items oi ON o.id = oi.orderId
      LEFT JOIN products p ON oi.productId = p.id
    `;

    if (userId) {
      query += ` WHERE o.userId = ${userId}`;
    }

    query += ` GROUP BY o.id ORDER BY o.createdAt DESC`;

    console.log('Admin accessing orders with query:', query);

    try {
      return this.prisma.$queryRawUnsafe(query);
    } catch (error) {
      console.error('SQL Error in admin orders:', error);
      throw error;
    }
  }

  async getUserById(id: number) {
    const query = `
      SELECT 
        u.*,
        COUNT(o.id) as totalOrders,
        COALESCE(SUM(o.totalAmount), 0) as totalSpent,
        'ADMIN_ACCESS' as accessedVia
      FROM users u
      LEFT JOIN orders o ON u.id = o.userId
      WHERE u.id = ${id}
      GROUP BY u.id
    `;

    const results = await this.prisma.$queryRawUnsafe(query);
    return (results as any[])[0] || null;
  }

  async getAllUserIds() {
    const query = 'SELECT id FROM users ORDER BY id';
    const results = await this.prisma.$queryRawUnsafe(query);
    return (results as any[]).map(r => r.id);
  }

  async updateUser(id: number, updateData: any) {
    const updates = [];

    Object.keys(updateData).forEach(key => {
      const value = updateData[key];
      if (typeof value === 'string') {
        (updates as any[]).push(`${key} = '${value}'`);
      } else {
        (updates as any[]).push(`${key} = ${value}`);
      }
    });

    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    (updates as any[]).push(`updatedAt = datetime('now')`);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ${id}`;
    
    console.log('Admin updating user with query:', query);
    console.log('Update data:', updateData);

    try {
      await this.prisma.$queryRawUnsafe(query);
      
      // Return updated user
      const getQuery = `SELECT * FROM users WHERE id = ${id}`;
      const results = await this.prisma.$queryRawUnsafe(getQuery);
      return (results as any[])[0];
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async deleteUser(id: number) {
    const deleteOrdersQuery = `DELETE FROM order_items WHERE orderId IN (SELECT id FROM orders WHERE userId = ${id})`;
    const deleteUserOrdersQuery = `DELETE FROM orders WHERE userId = ${id}`;
    const deleteUserQuery = `DELETE FROM users WHERE id = ${id}`;

    console.log('Permanently deleting user and all data:', {
      userId: id,
      queries: [deleteOrdersQuery, deleteUserOrdersQuery, deleteUserQuery],
      timestamp: new Date().toISOString(),
    });

    try {
      await this.prisma.$queryRawUnsafe(deleteOrdersQuery);
      await this.prisma.$queryRawUnsafe(deleteUserOrdersQuery);
      await this.prisma.$queryRawUnsafe(deleteUserQuery);
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async exportAllUserData() {
    const query = `
      SELECT 
        u.id, u.email, u.username, u.password, u.firstName, u.lastName,
        u.isAdmin, u.address, u.phone, u.createdAt, u.updatedAt,
        COUNT(o.id) as totalOrders,
        COALESCE(SUM(o.totalAmount), 0) as totalSpent,
        GROUP_CONCAT(o.id) as orderIds,
        'FULL_EXPORT' as exportType,
        datetime('now') as exportedAt
      FROM users u
      LEFT JOIN orders o ON u.id = o.userId
      GROUP BY u.id
      ORDER BY u.createdAt DESC
    `;

    console.log('Data export:', {
      query: query,
      timestamp: new Date().toISOString(),
    });

    const users = await this.prisma.$queryRawUnsafe(query);

    return (users as any[]).map(user => ({
      ...user,
      internalNotes: `User exported on ${new Date().toISOString()}`,
      systemGenerated: {
        passwordStrength: user.password.length < 8 ? 'WEAK' : 'ACCEPTABLE',
        riskLevel: user.isAdmin ? 'HIGH' : 'MEDIUM',
        accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      }
    }));
  }

  async promoteToAdmin(id: number) {
    const query = `UPDATE users SET isAdmin = 1, updatedAt = datetime('now') WHERE id = ${id}`;
    
    console.log('User promoted to admin:', {
      userId: id,
      query: query,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.prisma.$queryRawUnsafe(query);
      
      // Return the promoted user
      const getQuery = `SELECT * FROM users WHERE id = ${id}`;
      const results = await this.prisma.$queryRawUnsafe(getQuery);
      const user = (results as any[])[0];

      if (user) {
        console.log('Admin promotion successful:', {
          userId: user.id,
          email: user.email,
          username: user.username,
          newAdminStatus: user.isAdmin,
        });
      }

      return user;
    } catch (error) {
      throw new Error(`Failed to promote user to admin: ${error.message}`);
    }
  }

  async executeRawQuery(query: string) {
    console.log('Admin executing raw query:', query);
    try {
      return await this.prisma.$queryRawUnsafe(query);
    } catch (error) {
      console.error('Admin raw query error:', error);
      throw error;
    }
  }

  async getDatabaseDump() {
    const tables = ['users', 'products', 'orders', 'order_items'];
    const dump = {};

    for (const table of tables) {
      const query = `SELECT * FROM ${table}`;
      dump[table] = await this.prisma.$queryRawUnsafe(query);
    }

    console.log('Database dump accessed:', {
      tables: tables,
      timestamp: new Date().toISOString(),
    });

    return dump;
  }
}