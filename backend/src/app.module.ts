import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { BullModule } from '@nestjs/bull';
import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { ScreenshotsModule } from './screenshots/screenshots.module';
import { InsightsModule } from './insights/insights.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkersModule } from './workers/workers.module';
import { ReportsModule } from './reports/reports.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // GraphQL
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      subscriptions: {
        'graphql-ws': true,
        'subscriptions-transport-ws': true,
      },
      context: ({ req }) => ({ req }),
      playground: true,
      introspection: true,
    }),

    // BullMQ for background jobs
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB) || 0,
        },
      }),
    }),

    // Feature modules
    CommonModule,
    AuthModule,
    ScreenshotsModule,
    InsightsModule,
    NotificationsModule,
    WorkersModule,
    ReportsModule,
  ],
})
export class AppModule {} 