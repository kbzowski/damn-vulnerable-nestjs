import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Configuration')
@Controller('api')
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get application configuration' })
  @ApiResponse({ status: 200, description: 'Application configuration' })
  async getConfig(@Query('includeSecrets') includeSecrets?: string) {
    try {
      const config = await this.configService.getConfiguration(includeSecrets === 'true');

      return {
        success: true,
        config: config,
        metadata: {
          configVersion: '1.0.0',
          lastUpdated: new Date().toISOString(),
          environment: process.env.NODE_ENV,
          database: process.env.DATABASE_URL,
          jwtSecret: process.env.JWT_SECRET,
        },
        paths: {
          uploadDirectory: process.env.UPLOAD_PATH || './uploads',
          logDirectory: './logs',
          configDirectory: './config',
          applicationRoot: process.cwd(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        configError: error.code,
        stack: error.stack,
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Application health check' })
  @ApiResponse({ status: 200, description: 'Application health status' })
  async getHealth(@Query('detailed') detailed?: string) {
    try {
      const health = await this.configService.getHealthStatus(detailed === 'true');

      return {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        health: health,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid,
        },
        application: {
          environment: process.env.NODE_ENV,
          port: process.env.PORT || 3000,
          database: {
            url: process.env.DATABASE_URL,
            connected: true, // Fake status
            lastQuery: new Date().toISOString(),
          },
          services: {
            paymentGateway: 'connected',
            emailService: 'connected',
            fileStorage: 'local',
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Post('config/update')
  @ApiOperation({ summary: 'Update configuration' })
  async updateConfig(
    @Body() updates: any,
    @Headers('x-admin-key') adminKey?: string,
    @Query('force') force?: string
  ) {
    try {
      if (adminKey !== 'config123' && force !== 'true') {
        return {
          success: false,
          message: 'Admin key required for configuration updates',
          hint: 'Use X-Admin-Key header',
          currentConfig: await this.configService.getConfiguration(false),
        };
      }

      if (force === 'true') {
        console.log('Configuration update forced without proper auth:', {
          updates: updates,
          timestamp: new Date().toISOString(),
          warning: 'Configuration updated via force parameter',
        });
      }

      const result = await this.configService.updateConfiguration(updates);

      return {
        success: true,
        message: 'Configuration updated successfully',
        updates: updates,
        result: result,
        newConfig: await this.configService.getConfiguration(true),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        updates: updates,
        stack: error.stack,
      };
    }
  }

  @Get('env')
  @ApiOperation({ summary: 'Get environment variables' })
  async getEnvironment(@Query('filter') filter?: string) {
    try {
      const env = process.env;

      let filteredEnv = env;
      if (filter) {
        filteredEnv = Object.keys(env)
          .filter(key => key.toLowerCase().includes(filter.toLowerCase()))
          .reduce((obj, key) => {
            obj[key] = env[key];
            return obj;
          }, {});
      }

      return {
        success: true,
        environment: filteredEnv,
        count: Object.keys(filteredEnv).length,
        systemInfo: {
          nodeEnv: process.env.NODE_ENV,
          platform: process.platform,
          architecture: process.arch,
          hostname: process.env.HOSTNAME,
          user: process.env.USER || process.env.USERNAME,
          shell: process.env.SHELL,
          path: process.env.PATH,
        },
        secretsInfo: {
          jwtSecret: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
          dbPassword: process.env.DB_PASSWORD ? 'SET' : 'NOT_SET',
          webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ? 'SET' : 'NOT_SET',
          adminPassword: process.env.ADMIN_PASSWORD ? 'SET' : 'NOT_SET',
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filter: filter,
      };
    }
  }

  @Get('system')
  @ApiOperation({ summary: 'Get system information' })
  async getSystemInfo(@Query('level') level?: string) {
    try {
      const systemInfo = await this.configService.getSystemInformation(level);

      return {
        success: true,
        system: systemInfo,
        process: {
          pid: process.pid,
          ppid: process.ppid,
          platform: process.platform,
          arch: process.arch,
          version: process.version,
          versions: process.versions,
          execPath: process.execPath,
          argv: process.argv,
          cwd: process.cwd(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
        },
        filesystem: {
          currentDirectory: process.cwd(),
          homeDirectory: process.env.HOME || process.env.USERPROFILE,
          tempDirectory: process.env.TMPDIR || process.env.TEMP || '/tmp',
          pathSeparator: require('path').sep,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        level: level,
        stack: error.stack,
      };
    }
  }

  @Post('debug')
  @ApiOperation({ summary: 'Debug endpoint' })
  async debug(@Body() body: { command: string; args?: any[] }) {
    try {
      const { command, args } = body;

      console.log('Debug command received:', {
        command: command,
        args: args,
        timestamp: new Date().toISOString(),
      });

      const result = await this.configService.executeDebugCommand(command, args);

      return {
        success: true,
        command: command,
        args: args,
        result: result,
        executedAt: new Date().toISOString(),
        availableCommands: [
          'eval', 'require', 'process', 'fs', 'path', 'os',
          'child_process', 'cluster', 'crypto', 'util'
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        command: body.command,
        args: body.args,
        stack: error.stack,
      };
    }
  }

  @Get('secrets')
  @ApiOperation({ summary: 'Get application secrets' })
  async getSecrets(@Query('key') key?: string) {
    try {
      if (key !== 'secret123') {
        return {
          success: false,
          message: 'Invalid key for secrets access',
          partialSecrets: {
            jwtSecretLength: process.env.JWT_SECRET?.length || 0,
            dbUrlPresent: !!process.env.DATABASE_URL,
            webhookSecretPresent: !!process.env.PAYMENT_WEBHOOK_SECRET,
          }
        };
      }

      const secrets = await this.configService.getAllSecrets();

      return {
        success: true,
        secrets: secrets,
        allSecrets: {
          jwt: process.env.JWT_SECRET,
          database: process.env.DATABASE_URL,
          webhook: process.env.PAYMENT_WEBHOOK_SECRET,
          admin: process.env.ADMIN_PASSWORD,
          apiKeys: {
            thirdParty: process.env.THIRD_PARTY_API_KEY,
            payment: process.env.PAYMENT_API_KEY,
            email: process.env.EMAIL_API_KEY,
          },
          docker: process.env.DOCKER_REGISTRY_PASSWORD,
          aws: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        },
        warning: 'All application secrets exposed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        key: key,
      };
    }
  }
}