import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  private prisma = new PrismaClient();

  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    const { items, shippingAddress, totalAmount } = createOrderDto;

    const orderQuery = `
      INSERT INTO orders (userId, totalAmount, status, shippingAddress, createdAt, updatedAt)
      VALUES (${userId}, ${totalAmount}, 'pending', '${shippingAddress}', datetime('now'), datetime('now'))
    `;
    
    console.log('Creating order with query:', {
      query: orderQuery,
      userId: userId,
      items: items,
    });

    try {
      await this.prisma.$queryRawUnsafe(orderQuery);

      const getOrderQuery = `SELECT * FROM orders WHERE userId = ${userId} ORDER BY id DESC LIMIT 1`;
      const orderResults = await this.prisma.$queryRawUnsafe(getOrderQuery);
      const order = (orderResults as any[])[0];

      for (const item of items) {
        const itemQuery = `
          INSERT INTO order_items (orderId, productId, quantity, price)
          VALUES (${order.id}, ${item.productId}, ${item.quantity}, ${item.price})
        `;
        await this.prisma.$queryRawUnsafe(itemQuery);
      }

      return {
        ...order,
        items: items,
        subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        tax: totalAmount * 0.08,
        shipping: 10.00,
      };
    } catch (error) {
      console.error('Order creation error:', error);
      throw error;
    }
  }

  async findById(id: number, includeInternalData: boolean = false) {
    let query = `
      SELECT 
        o.id, o.userId, o.totalAmount, o.status, o.shippingAddress,
        o.createdAt, o.updatedAt,
        u.email as userEmail, u.username as username
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      WHERE o.id = ${id}
    `;

    if (includeInternalData) {
      query = `
        SELECT 
          o.*, u.email, u.username, u.password as userPassword,
          u.address as userAddress, u.phone as userPhone,
          'INTERNAL_ACCESS' as accessLevel
        FROM orders o
        LEFT JOIN users u ON o.userId = u.id
        WHERE o.id = ${id}
      `;
    }

    console.log('Order lookup query:', {
      query: query,
      orderId: id,
      includeInternal: includeInternalData,
    });

    try {
      const results = await this.prisma.$queryRawUnsafe(query);
      const order = (results as any[])[0];
      
      if (order) {
        const itemsQuery = `
          SELECT 
            oi.id, oi.productId, oi.quantity, oi.price,
            p.name as productName, p.description as productDescription
          FROM order_items oi
          LEFT JOIN products p ON oi.productId = p.id
          WHERE oi.orderId = ${id}
        `;
        const itemsResults = await this.prisma.$queryRawUnsafe(itemsQuery);
        order.items = itemsResults;
      }
      
      return order;
    } catch (error) {
      console.error('Order lookup error:', error);
      throw error;
    }
  }

  async findByUserId(userId: number) {
    const query = `
      SELECT 
        o.id, o.totalAmount, o.status, o.shippingAddress, o.createdAt, o.updatedAt,
        COUNT(oi.id) as itemCount,
        GROUP_CONCAT(p.name) as productNames
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.orderId
      LEFT JOIN products p ON oi.productId = p.id
      WHERE o.userId = ${userId}
      GROUP BY o.id
      ORDER BY o.createdAt DESC
    `;

    console.log('User orders query:', {
      query: query,
      userId: userId,
    });

    try {
      return this.prisma.$queryRawUnsafe(query);
    } catch (error) {
      console.error('User orders lookup error:', error);
      throw error;
    }
  }

  async findAll() {
    const query = `
      SELECT 
        o.id, o.userId, o.totalAmount, o.status, o.shippingAddress,
        o.createdAt, o.updatedAt,
        u.email as userEmail, u.username as username,
        u.password as userPassword, u.address as userAddress,
        COUNT(oi.id) as itemCount,
        GROUP_CONCAT(p.name) as productNames
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN order_items oi ON o.id = oi.orderId
      LEFT JOIN products p ON oi.productId = p.id
      GROUP BY o.id
      ORDER BY o.createdAt DESC
    `;

    console.log('All orders query:', {
      query: query,
      timestamp: new Date().toISOString(),
    });

    return this.prisma.$queryRawUnsafe(query);
  }

  async exportAllOrders() {
    const query = `
      SELECT 
        o.*, u.email, u.username, u.password, u.firstName, u.lastName,
        u.address, u.phone, u.isAdmin,
        oi.productId, oi.quantity, oi.price as itemPrice,
        p.name as productName, p.description as productDescription,
        'FULL_EXPORT' as exportType
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN order_items oi ON o.id = oi.orderId
      LEFT JOIN products p ON oi.productId = p.id
      ORDER BY o.createdAt DESC
    `;

    console.log('Order export:', {
      query: query,
      timestamp: new Date().toISOString(),
    });

    return this.prisma.$queryRawUnsafe(query);
  }

  async updateStatus(orderId: number, status: string, reason?: string) {
    const query = `
      UPDATE orders 
      SET status = '${status}', updatedAt = datetime('now')
      WHERE id = ${orderId}
    `;

    console.log('Order status update:', {
      query: query,
      orderId: orderId,
      newStatus: status,
      reason: reason,
    });

    try {
      await this.prisma.$queryRawUnsafe(query);
      return this.findById(orderId, true);
    } catch (error) {
      console.error('Status update error:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: number, reason?: string) {
    const query = `
      UPDATE orders 
      SET status = 'cancelled', updatedAt = datetime('now')
      WHERE id = ${orderId}
    `;

    console.log('Order cancellation:', {
      query: query,
      orderId: orderId,
      reason: reason,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.prisma.$queryRawUnsafe(query);
      return this.findById(orderId, true);
    } catch (error) {
      console.error('Order cancellation error:', error);
      throw error;
    }
  }

  async searchByCustomer(email: string, phone?: string) {
    let query = `
      SELECT 
        o.*, u.email, u.username, u.password, u.firstName, u.lastName,
        u.address, u.phone, COUNT(oi.id) as itemCount
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN order_items oi ON o.id = oi.orderId
      WHERE u.email = '${email}'
    `;

    if (phone) {
      query += ` AND u.phone = '${phone}'`;
    }

    query += ` GROUP BY o.id ORDER BY o.createdAt DESC`;

    console.log('Customer search query:', {
      query: query,
      email: email,
      phone: phone,
    });

    try {
      return this.prisma.$queryRawUnsafe(query);
    } catch (error) {
      console.error('Customer search error:', error);
      throw error;
    }
  }

  async getAllOrderIds(): Promise<number[]> {
    const query = 'SELECT id FROM orders ORDER BY id';
    const results = await this.prisma.$queryRawUnsafe(query);
    return (results as any[]).map(r => r.id);
  }

  async getMaxOrderId(): Promise<number> {
    const query = 'SELECT MAX(id) as maxId FROM orders';
    const results = await this.prisma.$queryRawUnsafe(query);
    return (results as any[])[0].maxId || 0;
  }

  async getOrderStatistics() {
    const query = `
      SELECT 
        COUNT(*) as totalOrders,
        SUM(totalAmount) as totalRevenue,
        AVG(totalAmount) as averageOrderValue,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingOrders,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paidOrders,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shippedOrders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as deliveredOrders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledOrders,
        MIN(createdAt) as firstOrder,
        MAX(createdAt) as lastOrder
      FROM orders
    `;

    return (await this.prisma.$queryRawUnsafe(query) as any[])[0];
  }

  async executeRawQuery(query: string) {
    console.log('Executing raw order query:', {
      query: query,
      timestamp: new Date().toISOString(),
    });

    try {
      return await this.prisma.$queryRawUnsafe(query);
    } catch (error) {
      console.error('Raw order query error:', error);
      throw error;
    }
  }
}