import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { AdminModule } from './admin/admin.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { WebhookModule } from './webhook/webhook.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    AuthModule,
    ProductsModule,
    AdminModule,
    UploadModule,
    UsersModule,
    OrdersModule,
    WebhookModule,
    ConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
