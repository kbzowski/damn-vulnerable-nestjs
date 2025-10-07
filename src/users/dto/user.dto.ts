import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'user@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'newusername', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: '123 Main St, City, State', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '555-0123', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Admin status'
  })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123', required: false })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  newPassword: string;
}