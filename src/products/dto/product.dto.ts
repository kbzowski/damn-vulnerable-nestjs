import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsUrl, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop Pro', description: 'Product name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'High-performance laptop for professionals', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1299.99, description: 'Product price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50, description: 'Stock quantity' })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 'Electronics', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateProductDto {
  @ApiProperty({ example: 'Updated Laptop Pro', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1199.99, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 25, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({ example: 'Updated Category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'https://example.com/new-image.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SearchProductDto {
  @ApiProperty({ example: 'laptop', description: 'Search query' })
  @IsString()
  query: string;

  @ApiProperty({ example: 'Electronics', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: '100', required: false, description: 'Minimum price' })
  @IsOptional()
  minPrice?: string;

  @ApiProperty({ example: '2000', required: false, description: 'Maximum price' })
  @IsOptional()
  maxPrice?: string;
}