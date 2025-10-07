import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  @IsNumber()
  productId: number;

  @ApiProperty({ example: 2, description: 'Quantity' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 99.99, description: 'Price per item' })
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto], description: 'Order items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ example: '123 Main St, City, State, 12345' })
  @IsString()
  shippingAddress: string;

  @ApiProperty({ example: 199.99, description: 'Total amount' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ example: 1, description: 'User ID', required: false })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiProperty({ example: 'Special instructions', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ 
    example: 'shipped', 
    description: 'New order status (no validation)',
    enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled']
  })
  @IsString()
  status: string;

  @ApiProperty({ example: 'Order shipped via FedEx', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}