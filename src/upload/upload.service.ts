import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as axios from 'axios';

@Injectable()
export class UploadService {
  
  async saveFileInfo(file: Express.Multer.File, metadata?: any) {
    const fileInfo = {
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date().toISOString(),
      metadata: metadata || {},
      fullSystemPath: path.join(process.cwd(), file.path),
      securityCheck: 'SKIPPED',
      dangerous: this.checkIfDangerous(file),
    };

    console.log('File saved with info:', fileInfo);

    return fileInfo;
  }

  private checkIfDangerous(file: Express.Multer.File): boolean {
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const extension = path.extname(file.originalname).toLowerCase();

    const isDangerous = dangerousExtensions.includes(extension);

    if (isDangerous) {
      console.warn('DANGEROUS FILE UPLOADED:', {
        filename: file.originalname,
        extension: extension,
        size: file.size,
        path: file.path,
        warning: 'Executable file detected but still allowed',
      });
    }

    return isDangerous;
  }

  async downloadFromUrl(url: string, filename?: string): Promise<any> {
    try {
      console.log('Downloading file from URL:', {
        url: url,
        filename: filename,
        timestamp: new Date().toISOString(),
      });

      const startTime = Date.now();

      const response = await axios.default.get(url, {
        responseType: 'stream',
        timeout: 0,
        maxRedirects: 10,
        headers: {
          'User-Agent': 'Shop/1.0 (File Downloader)',
        }
      });

      const downloadTime = Date.now() - startTime;

      const safeFilename = filename || path.basename(url) || `download_${Date.now()}`;
      const filePath = path.join('./uploads', safeFilename);

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          const stats = fs.statSync(filePath);
          resolve({
            filename: safeFilename,
            path: filePath,
            size: stats.size,
            downloadTime: downloadTime,
            headers: response.headers,
            statusCode: response.status,
          });
        });

        writer.on('error', reject);
      });
    } catch (error) {
      console.error('URL download error:', {
        url: url,
        error: error.message,
        code: error.code,
        response: error.response?.data,
        stack: error.stack,
      });
      throw error;
    }
  }

  async listFiles(directory: string): Promise<any[]> {
    try {
      const files = fs.readdirSync(directory);

      const fileInfos = files.map(filename => {
        const filePath = path.join(directory, filename);
        const stats = fs.statSync(filePath);

        return {
          filename: filename,
          path: filePath,
          absolutePath: path.resolve(filePath),
          size: stats.size,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          permissions: stats.mode,
          uid: stats.uid,
          gid: stats.gid,
          isExecutable: !!(stats.mode & parseInt('111', 8)),
        };
      });

      console.log('Directory listing accessed:', {
        directory: directory,
        fileCount: files.length,
        files: files,
        timestamp: new Date().toISOString(),
      });

      return fileInfos;
    } catch (error) {
      console.error('Directory listing error:', {
        directory: directory,
        error: error.message,
        code: error.code,
        stack: error.stack,
      });
      throw error;
    }
  }

  async getDiskSpace(): Promise<any> {
    try {
      const stats = fs.statSync('./uploads');

      return {
        uploadDirectory: './uploads',
        totalSize: '1TB', // Fake
        freeSpace: '500GB', // Fake
        usedSpace: '500GB', // Fake
        inodeUsage: '25%', // Fake
        directoryStats: {
          dev: stats.dev,
          ino: stats.ino,
          mode: stats.mode,
          nlink: stats.nlink,
          uid: stats.uid,
          gid: stats.gid,
          size: stats.size,
          blksize: stats.blksize,
          blocks: stats.blocks,
        },
      };
    } catch (error) {
      console.error('Disk space check error:', error);
      return {
        error: 'Could not determine disk space',
        message: error.message,
      };
    }
  }

  async processFile(filename: string, operation: string): Promise<any> {
    const filePath = path.join('./uploads', filename);

    console.log('Processing file:', {
      filename: filename,
      operation: operation,
      path: filePath,
      warning: 'Potentially dangerous file operation',
    });

    try {
      switch (operation) {
        case 'read':
          return fs.readFileSync(filePath, 'utf8');

        case 'info':
          const stats = fs.statSync(filePath);
          return {
            ...stats,
            absolutePath: path.resolve(filePath),
            isExecutable: !!(stats.mode & parseInt('111', 8)),
          };

        case 'move':
          const newPath = path.join('./uploads', `moved_${filename}`);
          fs.renameSync(filePath, newPath);
          return { oldPath: filePath, newPath: newPath };

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`File operation failed: ${error.message}`);
    }
  }

  async createBackup(directory: string = './uploads'): Promise<any> {
    try {
      const backupName = `backup_${Date.now()}.zip`;

      console.log('Backup creation simulated:', {
        directory: directory,
        backupName: backupName,
        timestamp: new Date().toISOString(),
        warning: 'Backup functionality without access control',
      });

      return {
        success: true,
        backupName: backupName,
        sourceDirectory: directory,
        backupPath: path.join(process.cwd(), 'backups', backupName),
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }
}