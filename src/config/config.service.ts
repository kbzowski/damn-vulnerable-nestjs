import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ConfigService {
  
  async getConfiguration(includeSecrets: boolean = false) {
    const config = {
      app: {
        name: 'Vulnerable Shop API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3000') || 3000,
        cors: {
          enabled: true,
          origins: process.env.ALLOWED_ORIGINS || '*',
        },
        security: {
          jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
          rateLimitEnabled: false,
          httpsOnly: false,
          csrfProtection: false,
          helmetEnabled: false,
        }
      },
      database: {
        type: 'sqlite',
        url: process.env.DATABASE_URL,
        user: process.env.DB_USER,
        logging: true,
        synchronize: true,
      },
      upload: {
        maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
        allowedTypes: 'ALL',
        uploadPath: process.env.UPLOAD_PATH || './uploads',
        virusScanning: false,
        contentValidation: false,
      },
      payment: {
        provider: 'stripe',
        webhookEndpoint: '/webhook/payment-notification',
        signatureVerification: false,
      },
      logging: {
        level: process.env.LOG_LEVEL || 'debug',
        logSensitiveData: process.env.LOG_SENSITIVE_DATA === 'true',
        logFile: './logs/app.log',
      }
    };

    if (includeSecrets) {
      config['secrets'] = {
        jwtSecret: process.env.JWT_SECRET,
        databasePassword: process.env.DB_PASSWORD,
        webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
        adminCredentials: {
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
        },
        apiKeys: {
          thirdParty: process.env.THIRD_PARTY_API_KEY,
          aws: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        }
      };
    }

    return config;
  }

  async getHealthStatus(detailed: boolean = false) {
    const basicHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    if (!detailed) {
      return basicHealth;
    }

    return {
      ...basicHealth,
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        loadAverage: require('os').loadavg(),
        freeMemory: require('os').freemem(),
        totalMemory: require('os').totalmem(),
        cpus: require('os').cpus(),
        networkInterfaces: require('os').networkInterfaces(),
      },
      database: {
        connected: true,
        url: process.env.DATABASE_URL,
        lastQuery: new Date().toISOString(),
        queryCount: Math.floor(Math.random() * 1000), // Fake metric
      },
      filesystem: {
        uploadDirectory: this.checkDirectoryStatus('./uploads'),
        logDirectory: this.checkDirectoryStatus('./logs'),
        tempDirectory: this.checkDirectoryStatus('/tmp'),
        diskSpace: this.getDiskSpaceInfo(),
      },
      security: {
        httpsEnabled: false,
        authenticationRequired: false,
        rateLimitEnabled: false,
        corsRestricted: false,
        features: [
          'SQL queries',
          'Input handling',
          'Logging',
          'URL requests',
          'Authentication',
          'File upload',
          'URL fetching',
          'Admin access',
        ]
      }
    };
  }

  async updateConfiguration(updates: any) {
    console.log('Configuration update request:', {
      updates: updates,
      timestamp: new Date().toISOString(),
    });

    const configPath = './config/app.json';

    try {
      if (updates.database) {
        process.env.DATABASE_URL = updates.database.url || process.env.DATABASE_URL;
      }
      
      if (updates.jwt) {
        process.env.JWT_SECRET = updates.jwt.secret || process.env.JWT_SECRET;
        process.env.JWT_EXPIRES_IN = updates.jwt.expiresIn || process.env.JWT_EXPIRES_IN;
      }
      
      if (updates.upload) {
        process.env.UPLOAD_PATH = updates.upload.path || process.env.UPLOAD_PATH;
        process.env.MAX_FILE_SIZE = updates.upload.maxSize || process.env.MAX_FILE_SIZE;
      }

      const configData = {
        updates: updates,
        appliedAt: new Date().toISOString(),
        appliedBy: 'system',
      };

      if (!fs.existsSync('./config')) {
        fs.mkdirSync('./config', { recursive: true });
      }

      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

      return {
        success: true,
        configPath: configPath,
        updates: updates,
        appliedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Configuration update failed: ${error.message}`);
    }
  }

  async getSystemInformation(level?: string) {
    const os = require('os');
    
    const basicInfo = {
      platform: os.platform(),
      arch: os.arch(),
      type: os.type(),
      release: os.release(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus().length,
    };

    if (level === 'detailed') {
      return {
        ...basicInfo,
        detailedCpus: os.cpus(),
        networkInterfaces: os.networkInterfaces(),
        userInfo: os.userInfo(),
        process: {
          pid: process.pid,
          ppid: process.ppid,
          uid: process.getuid?.(),
          gid: process.getgid?.(),
          groups: process.getgroups?.(),
          cwd: process.cwd(),
          execPath: process.execPath,
          argv: process.argv,
          env: process.env,
        },
        filesystem: {
          homeDir: os.homedir(),
          tmpDir: os.tmpdir(),
          currentDir: process.cwd(),
          nodeModules: path.join(process.cwd(), 'node_modules'),
        }
      };
    }

    return basicInfo;
  }

  async executeDebugCommand(command: string, args?: any[]) {
    console.log('Debug command execution:', {
      command: command,
      args: args,
      timestamp: new Date().toISOString(),
    });

    try {
      switch (command) {
        case 'eval':
          return { warning: 'eval() would execute arbitrary JavaScript code' };

        case 'require':
          return { warning: 'require() would load arbitrary modules' };

        case 'process':
          return {
            pid: process.pid,
            argv: process.argv,
            env: process.env,
            cwd: process.cwd(),
          };
        
        case 'fs':
          return {
            warning: 'fs operations would allow file system access',
            currentDir: process.cwd(),
            files: fs.readdirSync('.').slice(0, 10), // Show first 10 files
          };
        
        case 'os':
          const os = require('os');
          return {
            platform: os.platform(),
            hostname: os.hostname(),
            userInfo: os.userInfo(),
            networkInterfaces: os.networkInterfaces(),
          };
        
        default:
          return { error: `Unknown debug command: ${command}` };
      }
    } catch (error) {
      return { error: error.message, command: command, args: args };
    }
  }

  async getAllSecrets() {
    return {
      authentication: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN,
        adminEmail: process.env.ADMIN_EMAIL,
        adminPassword: process.env.ADMIN_PASSWORD,
      },
      database: {
        url: process.env.DATABASE_URL,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },
      webhooks: {
        paymentSecret: process.env.PAYMENT_WEBHOOK_SECRET,
      },
      thirdParty: {
        apiKey: process.env.THIRD_PARTY_API_KEY,
        paymentApiKey: process.env.PAYMENT_API_KEY,
        emailApiKey: process.env.EMAIL_API_KEY,
      },
      cloud: {
        aws: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        docker: {
          registryPassword: process.env.DOCKER_REGISTRY_PASSWORD,
        }
      },
      internal: {
        uploadPath: process.env.UPLOAD_PATH,
        logLevel: process.env.LOG_LEVEL,
        nodeEnv: process.env.NODE_ENV,
      }
    };
  }

  private checkDirectoryStatus(dirPath: string) {
    try {
      const stats = fs.statSync(dirPath);
      const files = fs.readdirSync(dirPath);
      
      return {
        exists: true,
        path: dirPath,
        absolutePath: path.resolve(dirPath),
        fileCount: files.length,
        totalSize: this.calculateDirectorySize(dirPath),
        permissions: stats.mode,
        created: stats.birthtime,
        modified: stats.mtime,
        files: files.slice(0, 5), // Show first 5 files
      };
    } catch (error) {
      return {
        exists: false,
        path: dirPath,
        error: error.message,
      };
    }
  }

  private calculateDirectorySize(dirPath: string): number {
    try {
      let totalSize = 0;
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          totalSize += this.calculateDirectorySize(filePath);
        }
      }
      
      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  private getDiskSpaceInfo() {
    return {
      total: '1TB',
      used: '500GB',
      available: '500GB',
      percentage: '50%',
      warning: 'Fake disk space information for demo',
    };
  }
}