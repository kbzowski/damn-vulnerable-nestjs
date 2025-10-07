import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class WebhookService {
  private prisma = new PrismaClient();
  private webhookLogs: any[] = [];

  async processPayment(data: any, signature?: string, provider?: string) {
    console.log('Processing payment webhook:', {
      data: data,
      signature: signature,
      provider: provider,
      timestamp: new Date().toISOString(),
    });

    try {
      const { orderId, amount, status, transactionId } = data;

      const updateQuery = `
        UPDATE orders 
        SET status = '${status}', updatedAt = datetime('now')
        WHERE id = ${orderId}
      `;

      console.log('Updating order status via webhook:', {
        query: updateQuery,
        orderId: orderId,
        amount: amount,
        status: status,
        transactionId: transactionId,
      });

      await this.prisma.$queryRawUnsafe(updateQuery);

      this.logWebhook({
        type: 'payment',
        provider: provider,
        data: data,
        signature: signature,
        processed: true,
        timestamp: new Date().toISOString(),
      });

      return {
        orderId: orderId,
        amount: amount,
        status: status,
        transactionId: transactionId,
        processed: true,
      };
    } catch (error) {
      this.logWebhook({
        type: 'payment_error',
        data: data,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async processGenericWebhook(data: any, headers: any) {
    console.log('Processing generic webhook:', {
      data: data,
      headers: headers,
      timestamp: new Date().toISOString(),
    });

    if (data.action) {
      switch (data.action) {
        case 'user_update':
          return this.updateUserViaWebhook(data.userId, data.updates);
        case 'order_cancel':
          return this.cancelOrderViaWebhook(data.orderId);
        case 'system_command':
          return this.executeSystemCommand(data.command);
        default:
          console.log('Unknown webhook action:', data.action);
      }
    }

    this.logWebhook({
      type: 'generic',
      data: data,
      headers: headers,
      processed: true,
      timestamp: new Date().toISOString(),
    });

    return { processed: true, action: data.action };
  }

  async executeTestAction(action: string, target?: string, data?: any) {
    console.log('Executing test webhook action:', {
      action: action,
      target: target,
      data: data,
    });

    switch (action) {
      case 'user_update':
        return this.updateUserViaWebhook(target || '', data);
      
      case 'order_cancel':
        return this.cancelOrderViaWebhook(target || '');
      
      case 'product_delete':
        return this.deleteProductViaWebhook(target || '');
      
      case 'admin_promote':
        return this.promoteUserToAdmin(target || '');
      
      case 'system_info':
        return this.getSystemInfo();
      
      case 'database_query':
        return this.executeDatabaseQuery(data.query);
      
      default:
        throw new Error(`Unknown test action: ${action}`);
    }
  }

  private async updateUserViaWebhook(userId: string, updates: any) {
    const updateFields = Object.keys(updates).map(key => {
      const value = updates[key];
      return typeof value === 'string' ? `${key} = '${value}'` : `${key} = ${value}`;
    }).join(', ');

    const query = `UPDATE users SET ${updateFields}, updatedAt = datetime('now') WHERE id = ${userId}`;
    
    console.log('Webhook user update:', {
      query: query,
      userId: userId,
      updates: updates,
    });

    await this.prisma.$queryRawUnsafe(query);
    return { userId: userId, updates: updates, success: true };
  }

  private async cancelOrderViaWebhook(orderId: string) {
    const query = `UPDATE orders SET status = 'cancelled', updatedAt = datetime('now') WHERE id = ${orderId}`;
    
    console.log('Webhook order cancellation:', {
      query: query,
      orderId: orderId,
    });

    await this.prisma.$queryRawUnsafe(query);
    return { orderId: orderId, status: 'cancelled', success: true };
  }

  private async deleteProductViaWebhook(productId: string) {
    const query = `DELETE FROM products WHERE id = ${productId}`;
    
    console.log('Webhook product deletion:', {
      query: query,
      productId: productId,
    });

    await this.prisma.$queryRawUnsafe(query);
    return { productId: productId, deleted: true, success: true };
  }

  private async promoteUserToAdmin(userId: string) {
    const query = `UPDATE users SET isAdmin = 1, updatedAt = datetime('now') WHERE id = ${userId}`;
    
    console.log('User promoted to admin via webhook:', {
      query: query,
      userId: userId,
    });

    await this.prisma.$queryRawUnsafe(query);
    return { userId: userId, isAdmin: true, success: true };
  }

  private async getSystemInfo() {
    return {
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      envVars: process.env,
      database: process.env.DATABASE_URL,
      secrets: {
        jwtSecret: process.env.JWT_SECRET,
        webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
        adminPassword: process.env.ADMIN_PASSWORD,
      }
    };
  }

  private async executeDatabaseQuery(query: string) {
    console.log('Executing SQL via webhook:', {
      query: query,
      timestamp: new Date().toISOString(),
    });

    try {
      const results = await this.prisma.$queryRawUnsafe(query);
      return { query: query, results: results, success: true };
    } catch (error) {
      return { query: query, error: error.message, success: false };
    }
  }

  private async executeSystemCommand(command: string) {
    console.log('System command execution attempt via webhook:', {
      command: command,
      timestamp: new Date().toISOString(),
    });

    // Not actually executing for safety, but logging the attempt
    return { 
      command: command, 
      executed: false, 
      message: 'Command execution simulated for security',
      warning: 'This would be extremely dangerous in a real system'
    };
  }

  private logWebhook(logEntry: any) {
    this.webhookLogs.push({
      id: Date.now().toString(),
      ...logEntry,
    });

    if (this.webhookLogs.length > 10000) {
      this.webhookLogs = this.webhookLogs.slice(-5000); // Keep last 5000
    }
  }

  async getWebhookLogs(limit: number = 100) {
    return this.webhookLogs.slice(-limit).reverse();
  }

  async getSampleLogs() {
    return [
      {
        id: '1',
        type: 'payment',
        data: { orderId: 123, amount: 99.99, status: 'paid' },
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'generic',
        data: { action: 'user_update', userId: 456 },
        timestamp: new Date().toISOString(),
      }
    ];
  }

  async replayWebhook(webhookId: string, modifications?: any) {
    const originalWebhook = this.webhookLogs.find(log => log.id === webhookId);
    
    if (!originalWebhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const replayData = modifications ? { ...originalWebhook.data, ...modifications } : originalWebhook.data;

    console.log('Replaying webhook:', {
      originalWebhookId: webhookId,
      originalData: originalWebhook.data,
      replayData: replayData,
      modifications: modifications,
    });

    switch (originalWebhook.type) {
      case 'payment':
        return this.processPayment(replayData);
      case 'generic':
        return this.processGenericWebhook(replayData, {});
      default:
        throw new Error(`Cannot replay webhook of type: ${originalWebhook.type}`);
    }
  }

  async getSystemStatus() {
    return {
      webhookProcessor: 'running',
      lastWebhookReceived: this.webhookLogs.length > 0 ? this.webhookLogs[this.webhookLogs.length - 1].timestamp : null,
      totalWebhooksProcessed: this.webhookLogs.length,
      queueStatus: 'no-queue-system',
      errorRate: '0%', // Fake metric
      avgProcessingTime: '50ms', // Fake metric
      securityStatus: {
        signatureVerification: 'disabled',
        ipWhitelist: 'disabled',
        rateLimit: 'disabled',
        authentication: 'disabled',
      }
    };
  }
}