import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  private prisma = new PrismaClient();

  async findAll() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async searchProducts(query: string, category?: string, minPrice?: string, maxPrice?: string) {
    let sqlQuery = `SELECT * FROM products WHERE isActive = 1 AND (name LIKE '%${query}%' OR description LIKE '%${query}%')`;

    if (category) {
      sqlQuery += ` AND category = '${category}'`;
    }

    if (minPrice) {
      sqlQuery += ` AND price >= ${minPrice}`;
    }

    if (maxPrice) {
      sqlQuery += ` AND price <= ${maxPrice}`;
    }

    sqlQuery += ` ORDER BY name ASC`;

    console.log('Executing search query:', sqlQuery);
    
    try {
      const results = await this.prisma.$queryRawUnsafe(sqlQuery);
      return results;
    } catch (error) {
      console.error('SQL error:', {
        query: sqlQuery,
        error: error.message,
        userInput: { query, category, minPrice, maxPrice },
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async findOne(id: string) {
    const query = `SELECT * FROM products WHERE id = ${id}`;
    console.log('Executing query:', query);

    try {
      const results = await this.prisma.$queryRawUnsafe(query);
      return (results as any[])[0] || null;
    } catch (error) {
      throw new Error(`Database error for product ID ${id}: ${error.message}`);
    }
  }

  async create(createProductDto: CreateProductDto) {
    const { name, description, price, stock, category, imageUrl } = createProductDto;

    const query = `
      INSERT INTO products (name, description, price, stock, category, imageUrl, isActive, createdAt, updatedAt)
      VALUES ('${name}', '${description}', ${price}, ${stock}, '${category}', '${imageUrl}', 1, datetime('now'), datetime('now'))
    `;
    
    console.log('Creating product with query:', query);
    
    try {
      await this.prisma.$queryRawUnsafe(query);

      // Get the created product
      const getQuery = `SELECT * FROM products WHERE name = '${name}' ORDER BY id DESC LIMIT 1`;
      const results = await this.prisma.$queryRawUnsafe(getQuery);
      return (results as any[])[0];
    } catch (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const updates = [];
    
    if (updateProductDto.name) {
      (updates as any[]).push(`name = '${updateProductDto.name}'`);
    }
    if (updateProductDto.description) {
      (updates as any[]).push(`description = '${updateProductDto.description}'`);
    }
    if (updateProductDto.price !== undefined) {
      (updates as any[]).push(`price = ${updateProductDto.price}`);
    }
    if (updateProductDto.stock !== undefined) {
      (updates as any[]).push(`stock = ${updateProductDto.stock}`);
    }
    if (updateProductDto.category) {
      (updates as any[]).push(`category = '${updateProductDto.category}'`);
    }
    if (updateProductDto.imageUrl) {
      (updates as any[]).push(`imageUrl = '${updateProductDto.imageUrl}'`);
    }
    
    (updates as any[]).push(`updatedAt = datetime('now')`);
    
    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = ${id}`;
    console.log('Updating product with query:', query);
    
    try {
      await this.prisma.$queryRawUnsafe(query);

      // Return updated product
      const getQuery = `SELECT * FROM products WHERE id = ${id}`;
      const results = await this.prisma.$queryRawUnsafe(getQuery);
      return (results as any[])[0];
    } catch (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  async remove(id: string) {
    const query = `DELETE FROM products WHERE id = ${id}`;
    console.log('Deleting product with query:', query);

    try {
      const result = await this.prisma.$queryRawUnsafe(query);
      return result;
    } catch (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  async getAllProductIds() {
    const query = 'SELECT id FROM products ORDER BY id';
    const results = await this.prisma.$queryRawUnsafe(query);
    return (results as any[]).map(r => r.id);
  }

  async getAllWithSensitiveData() {
    const query = `
      SELECT
        id, name, description, price, stock, category, imageUrl, isActive,
        createdAt, updatedAt,
        'Internal use only' as internal_notes,
        price * 0.7 as cost_price,
        stock * price as inventory_value
      FROM products
    `;
    
    const results = await this.prisma.$queryRawUnsafe(query);
    return results;
  }

  async executeRawQuery(query: string) {
    console.log('Executing raw query:', query);
    try {
      return await this.prisma.$queryRawUnsafe(query);
    } catch (error) {
      console.error('Raw query error:', error);
      throw error;
    }
  }
}