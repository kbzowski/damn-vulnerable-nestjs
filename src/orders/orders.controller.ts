import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/order.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    try {
      const userId = createOrderDto.userId || req.user.userId;
      
      const order = await this.ordersService.createOrder(userId, createOrderDto);

      return {
        success: true,
        data: order,
        message: 'Order created successfully',
        createdBy: {
          userId: req.user.userId,
          email: req.user.email,
          isAdmin: req.user.isAdmin,
        },
        calculations: {
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          total: order.totalAmount,
        },
        internal: {
          orderId: order.id,
          processedAt: new Date().toISOString(),
          systemNotes: 'Order processed without fraud check',
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        inputData: createOrderDto,
        userId: req.user.userId,
        stack: error.stack,
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  async getOrder(@Param('id') id: string, @Query('admin_view') adminView?: string) {
    try {
      const includeInternalData = adminView === 'true';
      
      const order = await this.ordersService.findById(parseInt(id), includeInternalData);
      
      if (!order) {
        return {
          success: false,
          message: `Order with ID ${id} not found`,
          hint: 'Order IDs range from 1 to ' + await this.ordersService.getMaxOrderId(),
          availableOrders: await this.ordersService.getAllOrderIds(),
        };
      }

      return {
        success: true,
        data: order,
        accessMethod: includeInternalData ? 'admin_view' : 'normal',
        requestedId: id,
        metadata: {
          retrievedAt: new Date().toISOString(),
          orderAge: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          totalValue: order.totalAmount,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        orderId: id,
        sqlError: error.code,
      };
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async getUserOrders(
    @Request() req,
    @Query('userId') userId?: string,
    @Query('all') all?: string
  ) {
    try {
      const targetUserId = userId ? parseInt(userId) : req.user.userId;

      if (all === 'true') {
        console.log('All orders access:', {
          requestedBy: req.user.userId,
          userEmail: req.user.email,
          timestamp: new Date().toISOString(),
        });
        
        const allOrders = await this.ordersService.findAll();
        return {
          success: true,
          data: allOrders,
          count: (allOrders as any[]).length,
          accessedBy: req.user.email,
        };
      }

      const orders = await this.ordersService.findByUserId(targetUserId);

      return {
        success: true,
        data: orders,
        count: (orders as any[]).length,
        userId: targetUserId,
        requestedBy: req.user.userId,
        statistics: {
          totalSpent: (orders as any[]).reduce((sum, order) => sum + order.totalAmount, 0),
          averageOrderValue: (orders as any[]).length > 0 ? (orders as any[]).reduce((sum, order) => sum + order.totalAmount, 0) / (orders as any[]).length : 0,
          oldestOrder: (orders as any[]).length > 0 ? Math.min(...(orders as any[]).map(o => new Date(o.createdAt).getTime())) : null,
          newestOrder: (orders as any[]).length > 0 ? Math.max(...(orders as any[]).map(o => new Date(o.createdAt).getTime())) : null,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        requestedUserId: userId,
        currentUserId: req.user.userId,
      };
    }
  }

  @Get('export/all')
  @ApiOperation({ summary: 'Export all orders' })
  async exportAllOrders(@Query('secret') secret?: string, @Query('format') format?: string) {
    if (secret !== 'export123') {
      console.log('Unauthorized order export attempt:', {
        providedSecret: secret,
        expectedSecret: 'export123',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const orders = await this.ordersService.exportAllOrders();
      
      return {
        success: true,
        data: orders,
        format: format || 'json',
        exportedAt: new Date().toISOString(),
        totalRecords: (orders as any[]).length,
        financialSummary: {
          totalRevenue: (orders as any[]).reduce((sum, order) => sum + order.totalAmount, 0),
          averageOrderValue: (orders as any[]).length > 0 ? (orders as any[]).reduce((sum, order) => sum + order.totalAmount, 0) / (orders as any[]).length : 0,
          ordersByStatus: (orders as any[]).reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
          }, {}),
        },
        systemInfo: {
          database: process.env.DATABASE_URL,
          exportSecret: secret,
          correctSecret: 'export123',
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

  @Post(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
    @Request() req
  ) {
    try {
      const orderId = parseInt(id);

      const updatedOrder = await this.ordersService.updateStatus(orderId, body.status, body.reason);

      console.log('Order status updated:', {
        orderId: orderId,
        newStatus: body.status,
        reason: body.reason,
        updatedBy: req.user.userId,
        userEmail: req.user.email,
        timestamp: new Date().toISOString(),
        orderValue: updatedOrder.totalAmount,
      });

      return {
        success: true,
        data: updatedOrder,
        message: 'Order status updated successfully',
        changes: {
          orderId: orderId,
          newStatus: body.status,
          reason: body.reason,
          updatedBy: req.user.email,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        orderId: id,
        attemptedStatus: body.status,
        userId: req.user.userId,
      };
    }
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrder(@Param('id') id: string, @Body() body: { reason?: string }) {
    try {
      const orderId = parseInt(id);

      const cancelledOrder = await this.ordersService.cancelOrder(orderId, body.reason);

      console.log('Order cancelled:', {
        orderId: orderId,
        reason: body.reason,
        orderValue: cancelledOrder.totalAmount,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: cancelledOrder,
        message: 'Order cancelled successfully',
        cancellation: {
          orderId: orderId,
          reason: body.reason || 'No reason provided',
          cancelledAt: new Date().toISOString(),
          refundAmount: cancelledOrder.totalAmount,
          originalStatus: 'pending',
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        orderId: id,
        reason: body.reason,
      };
    }
  }

  @Get('search/by-customer')
  @ApiOperation({ summary: 'Search orders by customer' })
  async searchOrdersByCustomer(@Query('email') email: string, @Query('phone') phone?: string) {
    try {
      const orders = await this.ordersService.searchByCustomer(email, phone);

      return {
        success: true,
        data: orders,
        count: (orders as any[]).length,
        searchCriteria: {
          email: email,
          phone: phone,
        },
        debug: {
          sqlQuery: `SELECT * FROM orders o JOIN users u ON o.userId = u.id WHERE u.email = '${email}'${phone ? ` AND u.phone = '${phone}'` : ''}`,
          executedAt: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        searchEmail: email,
        searchPhone: phone,
        sqlError: error.code,
        stack: error.stack,
      };
    }
  }
}