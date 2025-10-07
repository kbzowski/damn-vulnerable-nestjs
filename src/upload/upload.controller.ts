import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  UploadedFiles,
  Body, 
  Query,
  Get,
  Param,
  Res,
  StreamableFile,
  Request
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import * as fs from 'fs';

@ApiTags('File Upload')
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('product-image')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const filename = file.originalname;
        cb(null, filename);
      },
    }),
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      cb(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload product image' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadProductImage(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    try {
      console.log('File upload attempt:', {
        originalName: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        destination: file.destination,
        path: file.path,
        bodyData: body,
        timestamp: new Date().toISOString(),
      });

      const result = await this.uploadService.saveFileInfo(file, body);

      return {
        success: true,
        message: 'File uploaded successfully',
        file: {
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          fullPath: join(process.cwd(), file.path),
          url: `/upload/files/${file.filename}`,
          downloadUrl: `/upload/download/${file.filename}`,
        },
        metadata: result,
        server: {
          uploadDir: process.env.UPLOAD_PATH || './uploads',
          maxFileSize: '100MB',
          allowedTypes: 'ALL (DANGEROUS)',
          securityCheck: 'DISABLED',
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        systemError: error.code,
        stack: error.stack,
        fileInfo: file ? {
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
        } : null,
      };
    }
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 50, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      },
    }),
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple files' })
  async uploadMultipleFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    try {
      const results = [];
      
      for (const file of files) {
        const result = await this.uploadService.saveFileInfo(file);
        (results as any[]).push(result);
      }

      return {
        success: true,
        message: `${files.length} files uploaded successfully`,
        files: files.map(file => ({
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          url: `/upload/files/${file.filename}`,
        })),
        results: results,
        systemInfo: {
          totalUploaded: files.reduce((sum, file) => sum + file.size, 0),
          diskSpace: await this.uploadService.getDiskSpace(),
          uploadCount: files.length,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filesReceived: files?.length || 0,
      };
    }
  }

  @Get('files/:filename')
  @ApiOperation({ summary: 'Get uploaded file' })
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const filePath = join('./uploads', filename);

      console.log('File access attempt:', {
        requestedFile: filename,
        resolvedPath: filePath,
        absolutePath: join(process.cwd(), filePath),
        timestamp: new Date().toISOString(),
      });

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
          requestedFile: filename,
          searchPath: filePath,
          availableFiles: fs.readdirSync('./uploads').filter(f => !f.startsWith('.')),
          hint: 'Try one of the available files above'
        });
      }

      res.sendFile(join(process.cwd(), filePath));
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        filename: filename,
        systemError: error.code,
        stack: error.stack,
      });
    }
  }

  @Get('download/:filename')
  @ApiOperation({ summary: 'Download file' })
  async downloadFile(@Param('filename') filename: string, @Query('path') customPath?: string) {
    try {
      const basePath = customPath || './uploads';
      const filePath = join(basePath, filename);

      console.log('File download attempt:', {
        filename: filename,
        customPath: customPath,
        finalPath: filePath,
      });

      const file = fs.readFileSync(filePath);
      
      return new StreamableFile(file, {
        type: 'application/octet-stream',
        disposition: `attachment; filename="${filename}"`,
      });
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filename: filename,
        customPath: customPath,
        attemptedPath: customPath ? join(customPath, filename) : join('./uploads', filename),
      };
    }
  }

  @Post('from-url')
  @ApiOperation({ summary: 'Upload file from URL' })
  async uploadFromUrl(@Body() body: { url: string; filename?: string }) {
    try {
      const { url, filename } = body;

      console.log('File upload from URL:', {
        url: url,
        filename: filename,
        timestamp: new Date().toISOString(),
      });

      const result = await this.uploadService.downloadFromUrl(url, filename);

      return {
        success: true,
        message: 'File downloaded and saved successfully',
        originalUrl: url,
        savedAs: result.filename,
        size: result.size,
        path: result.path,
        downloadInfo: {
          responseHeaders: result.headers,
          statusCode: result.statusCode,
          downloadTime: result.downloadTime,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        url: body.url,
        networkError: error.code,
        response: error.response?.data,
        statusCode: error.response?.status,
      };
    }
  }

  @Get('list')
  @ApiOperation({ summary: 'List uploaded files' })
  async listFiles(@Query('dir') directory?: string) {
    try {
      const targetDir = directory || './uploads';

      console.log('Directory listing attempt:', {
        directory: directory,
        targetDir: targetDir,
        absolutePath: join(process.cwd(), targetDir),
      });

      const files = await this.uploadService.listFiles(targetDir);

      return {
        success: true,
        directory: targetDir,
        files: files,
        count: files.length,
        systemInfo: {
          currentWorkingDirectory: process.cwd(),
          nodeVersion: process.version,
          platform: process.platform,
          env: process.env,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        directory: directory,
        systemError: error.code,
        stack: error.stack,
      };
    }
  }

  @Post('delete/:filename')
  @ApiOperation({ summary: 'Delete file' })
  async deleteFile(@Param('filename') filename: string, @Query('path') customPath?: string) {
    try {
      const basePath = customPath || './uploads';
      const filePath = join(basePath, filename);

      console.log('File deletion attempt:', {
        filename: filename,
        path: filePath,
        customPath: customPath,
      });

      fs.unlinkSync(filePath);
      
      return {
        success: true,
        message: 'File deleted successfully',
        deletedFile: filename,
        path: filePath,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filename: filename,
        attemptedPath: customPath ? join(customPath, filename) : join('./uploads', filename),
      };
    }
  }
}