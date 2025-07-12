import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';

// Simple module for testing
import { Module, Controller, Get } from '@nestjs/common';

@Controller()
class AppController {
  @Get()
  getHello(): string {
    return 'TimeFlow Backend is running! 🚀';
  }

  @Get('/health')
  getHealth(): any {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      redis: {
        host: process.env.REDIS_HOST || 'not set',
        port: process.env.REDIS_PORT || 'not set',
      },
      supabase: {
        url: process.env.SUPABASE_URL ? 'configured' : 'not set',
      }
    };
  }
}

@Module({
  controllers: [AppController],
})
class SimpleAppModule {}

async function bootstrap() {
  try {
    console.log('🚀 Starting TimeFlow Backend...');
    
    const app = await NestFactory.create<NestFastifyApplication>(
      SimpleAppModule,
      new FastifyAdapter({ logger: true }),
    );

    // Enable CORS
    app.enableCors({
      origin: true,
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    
    console.log(`✅ TimeFlow Backend running on port ${port}`);
    console.log(`🌐 Health check: http://localhost:${port}/health`);
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap(); 