import { Controller, Post, Body, Headers, Request, Get, Query } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Webhooks')
@Controller('webhook')
export class WebhookController {
  constructor(private webhookService: WebhookService) {}

  @Post('payment-notification')
  @ApiOperation({ summary: 'Payment notification webhook' })
  @ApiHeader({ name: 'X-Payment-Signature', description: 'Payment signature', required: false })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handlePaymentNotification(
    @Body() body: any,
    @Headers('x-payment-signature') signature?: string,
    @Headers('x-payment-provider') provider?: string,
    @Request() req?: any
  ) {
    try {
      console.log('Payment webhook received:', {
        body: body,
        signature: signature,
        provider: provider,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });

      const result = await this.webhookService.processPayment(body, signature, provider);

      return {
        success: true,
        message: 'Payment notification processed',
        data: result,
        processing: {
          signature: signature,
          provider: provider,
          verified: false, // Always false since we don't verify
          processed: true,
          timestamp: new Date().toISOString(),
        },
        internal: {
          webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
          expectedSignature: 'not-calculated',
          securityCheck: 'SKIPPED',
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        receivedData: body,
        signature: signature,
        provider: provider,
        stack: error.stack,
      };
    }
  }

  @Post('generic')
  @ApiOperation({ summary: 'Generic webhook endpoint' })
  async handleGenericWebhook(@Body() body: any, @Headers() headers: any, @Request() req: any) {
    try {
      console.log('Generic webhook received:', {
        body: body,
        headers: headers,
        ip: req.ip,
        method: req.method,
        url: req.url,
      });

      const result = await this.webhookService.processGenericWebhook(body, headers);

      return {
        success: true,
        message: 'Generic webhook processed',
        data: result,
        received: {
          body: body,
          headers: headers,
          processedAt: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        receivedBody: body,
        receivedHeaders: headers,
      };
    }
  }

  @Post('test')
  @ApiOperation({ summary: 'Test webhook endpoint' })
  async testWebhook(
    @Body() body: { 
      action: string; 
      target?: string; 
      data?: any; 
      secret?: string 
    }
  ) {
    try {
      if (body.secret !== 'test123') {
        console.log('Test webhook with wrong secret:', {
          providedSecret: body.secret,
          expectedSecret: 'test123',
          action: body.action,
          target: body.target,
        });
      }

      const result = await this.webhookService.executeTestAction(body.action, body.target, body.data);

      return {
        success: true,
        message: 'Test webhook executed',
        action: body.action,
        target: body.target,
        result: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        action: body.action,
        target: body.target,
        data: body.data,
      };
    }
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get webhook logs' })
  async getWebhookLogs(@Query('secret') secret?: string, @Query('limit') limit?: string) {
    try {
      if (secret !== 'logs123') {
        return {
          success: false,
          message: 'Invalid secret for webhook logs',
          sampleLogs: await this.webhookService.getSampleLogs(),
        };
      }

      const logs = await this.webhookService.getWebhookLogs(parseInt(limit || '100') || 100);

      return {
        success: true,
        logs: logs,
        count: logs.length,
        logInfo: {
          totalLogsAvailable: 'unlimited',
          logLevel: 'debug',
          rotationPolicy: 'none',
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        hint: 'Webhook logs unavailable',
      };
    }
  }

  @Post('replay/:id')
  @ApiOperation({ summary: 'Replay webhook by ID' })
  async replayWebhook(@Body() body: { webhookId: string; modifications?: any }) {
    try {
      const result = await this.webhookService.replayWebhook(body.webhookId, body.modifications);

      console.log('Webhook replay executed:', {
        webhookId: body.webhookId,
        modifications: body.modifications,
        result: result,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Webhook replayed successfully',
        originalWebhookId: body.webhookId,
        modifications: body.modifications,
        replayResult: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        webhookId: body.webhookId,
        modifications: body.modifications,
      };
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Webhook system status' })
  async getWebhookStatus() {
    try {
      const status = await this.webhookService.getSystemStatus();

      return {
        success: true,
        status: status,
        configuration: {
          webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
          providers: ['stripe', 'paypal', 'square'],
          endpoints: [
            '/webhook/payment-notification',
            '/webhook/generic',
            '/webhook/test',
          ]
        },
        systemInfo: {
          environment: process.env.NODE_ENV,
          webhookProcessorVersion: '1.0.0',
          lastRestart: new Date().toISOString(),
          memoryUsage: process.memoryUsage(),
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
}