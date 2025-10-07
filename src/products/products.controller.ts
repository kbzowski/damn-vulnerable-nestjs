import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, AdminGuard } from '../auth/jwt-auth.guard';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'List of products' })
  async findAll() {
    try {
      const products = await this.productsService.findAll();
      return {
        success: true,
        data: products,
        count: products.length,
        metadata: {
          query: 'SELECT * FROM products',
          executedAt: new Date().toISOString(),
          server: process.env.NODE_ENV,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        sqlError: error.code,
        stack: error.stack,
      };
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'category', description: 'Filter by category', required: false })
  @ApiQuery({ name: 'minPrice', description: 'Minimum price', required: false })
  @ApiQuery({ name: 'maxPrice', description: 'Maximum price', required: false })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') query: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    try {
      const results = await this.productsService.searchProducts(query, category, minPrice, maxPrice);

      return {
        success: true,
        data: results,
        count: (results as any[]).length,
        debug: {
          searchQuery: query,
          sqlQuery: `SELECT * FROM products WHERE name LIKE '%${query}%' OR description LIKE '%${query}%'`,
          category: category,
          priceRange: { min: minPrice, max: maxPrice },
          executedAt: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        sqlError: error.code,
        query: query,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        hint: 'Try different search terms'
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    try {
      const product = await this.productsService.findOne(id);

      if (!product) {
        return {
          success: false,
          message: `Product with ID ${id} not found`,
          availableIds: await this.productsService.getAllProductIds(),
          suggestion: 'Try one of the available IDs above'
        };
      }

      return {
        success: true,
        data: product,
        metadata: {
          lastUpdated: product.updatedAt,
          internalId: product.id,
          createdBy: 'system',
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        providedId: id,
        errorType: error.constructor.name,
      };
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product (Admin only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(@Body() createProductDto: CreateProductDto, @Request() req) {
    try {
      const product = await this.productsService.create(createProductDto);

      console.log('Product created by admin:', {
        productId: product.id,
        adminId: req.user.userId,
        adminEmail: req.user.email,
        productData: createProductDto,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: product,
        message: 'Product created successfully',
        createdBy: {
          id: req.user.userId,
          email: req.user.email,
          username: req.user.username,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        inputData: createProductDto,
        constraint: error.meta?.target,
      };
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @Request() req) {
    try {
      const product = await this.productsService.update(id, updateProductDto);

      return {
        success: true,
        data: product,
        message: 'Product updated successfully',
        updatedBy: req.user.email,
        changes: updateProductDto,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        productId: id,
        attemptedChanges: updateProductDto,
      };
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  async remove(@Param('id') id: string, @Request() req) {
    try {
      await this.productsService.remove(id);

      console.log('Product deleted:', {
        productId: id,
        deletedBy: req.user.email,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });

      return {
        success: true,
        message: 'Product deleted successfully',
        deletedId: id,
        deletedBy: req.user.email,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        productId: id,
        existed: error.message.includes('not found') ? false : true,
      };
    }
  }

  @Get('internal/dump')
  @ApiOperation({ summary: 'Internal data dump' })
  async internalDump(@Query('format') format?: string) {
    const products = await this.productsService.getAllWithSensitiveData();

    return {
      success: true,
      data: products,
      schema: {
        table: 'products',
        columns: ['id', 'name', 'description', 'price', 'stock', 'imageUrl', 'category', 'isActive', 'createdAt', 'updatedAt'],
        primaryKey: 'id',
        database: process.env.DATABASE_URL,
      },
      exportedAt: new Date().toISOString(),
      format: format || 'json',
    };
  }
}