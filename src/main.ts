import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cors from 'cors';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true,
  }));

  const config = new DocumentBuilder()
    .setTitle('Vulnerable Shop API')
    .setDescription('API for vulnerable e-commerce application - DO NOT USE IN PRODUCTION')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Development')
    .addServer('https://api.vulnerable-shop.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;

  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api`);
  console.log(`🔑 Admin credentials: admin@shop.com / password123`);
  console.log(`💾 Database: ${process.env.DATABASE_URL}`);
  
  await app.listen(port);
}
bootstrap();
