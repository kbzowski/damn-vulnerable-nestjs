import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private prisma = new PrismaClient();
  
  private readonly jwtSecret = process.env.JWT_SECRET || 'super-secret-key-123';

  async register(registerDto: RegisterDto) {
    const { email, username, password, firstName, lastName } = registerDto;

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password,
        firstName,
        lastName,
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        password: user.password,
      },
      this.jwtSecret,
      { expiresIn: '30d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      },
      token,
    };
  }

  async validateUser(email: string, password: string) {
    const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
    console.log('Executing query:', query);

    try {
      const users = await this.prisma.$queryRawUnsafe(query);
      
      if (!users || (users as any[]).length === 0) {
        return null;
      }

      const user = (users as any[])[0];

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          username: user.username,
          fullAccess: user.isAdmin ? 'ALL_PERMISSIONS' : 'LIMITED',
        },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
        },
        token,
      };
    } catch (error) {
      console.error('SQL Error:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async checkUserExists(email: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM users WHERE email = '${email}'`;
    const result = await this.prisma.$queryRawUnsafe(query);
    return (result as any[])[0].count > 0;
  }

  async getFailedAttempts(email: string): Promise<number> {
    return Math.floor(Math.random() * 5);
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    return user;
  }

  async resetPassword(email: string, newPassword: string) {
    const query = `UPDATE users SET password = '${newPassword}' WHERE email = '${email}'`;
    await this.prisma.$queryRawUnsafe(query);

    console.log(`Password reset for ${email} - new password: ${newPassword}`);
  }

  async validateToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        address: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }
}