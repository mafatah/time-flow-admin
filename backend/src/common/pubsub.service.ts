import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from 'graphql-subscriptions';
import Redis from 'ioredis';

@Injectable()
export class PubSubService implements OnModuleDestroy {
  private readonly logger = new Logger(PubSubService.name);
  private pubSub: PubSub;
  private redisPublisher: Redis;
  private redisSubscriber: Redis;

  constructor(private configService: ConfigService) {
    this.initializeRedis();
    this.pubSub = new PubSub();
  }

  private initializeRedis() {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: parseInt(this.configService.get<string>('REDIS_PORT', '6379')),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: parseInt(this.configService.get<string>('REDIS_DB', '0')),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    };

    this.redisPublisher = new Redis(redisConfig);
    this.redisSubscriber = new Redis(redisConfig);

    this.redisPublisher.on('connect', () => {
      this.logger.log('Redis publisher connected');
    });

    this.redisSubscriber.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });

    this.redisPublisher.on('error', (error) => {
      this.logger.error('Redis publisher error:', error);
    });

    this.redisSubscriber.on('error', (error) => {
      this.logger.error('Redis subscriber error:', error);
    });
  }

  async publish(triggerName: string, payload: any): Promise<void> {
    try {
      await this.redisPublisher.publish(triggerName, JSON.stringify(payload));
      this.logger.debug(`Published to ${triggerName}:`, payload);
    } catch (error) {
      this.logger.error(`Failed to publish to ${triggerName}:`, error);
      throw error;
    }
  }

  asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    const triggerArray = Array.isArray(triggers) ? triggers : [triggers];
    
    return {
      [Symbol.asyncIterator]: () => this.createAsyncIterator<T>(triggerArray),
    }[Symbol.asyncIterator]();
  }

  private async *createAsyncIterator<T>(triggers: string[]): AsyncGenerator<T> {
    const subscriber = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: parseInt(this.configService.get<string>('REDIS_PORT', '6379')),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: parseInt(this.configService.get<string>('REDIS_DB', '0')),
    });

    const messageQueue: T[] = [];
    let resolveNext: ((value: IteratorResult<T>) => void) | null = null;
    let isCompleted = false;

    // Subscribe to all triggers
    await subscriber.subscribe(...triggers);

    subscriber.on('message', (channel: string, message: string) => {
      try {
        const payload = JSON.parse(message) as T;
        
        if (resolveNext) {
          resolveNext({ value: payload, done: false });
          resolveNext = null;
        } else {
          messageQueue.push(payload);
        }
      } catch (error) {
        this.logger.error('Failed to parse Redis message:', error);
      }
    });

    try {
      while (!isCompleted) {
        if (messageQueue.length > 0) {
          const value = messageQueue.shift()!;
          yield value;
        } else {
          // Wait for next message
          await new Promise<void>((resolve) => {
            resolveNext = (result) => {
              if (!result.done) {
                resolve();
              }
            };
          });
          
          if (messageQueue.length > 0) {
            const value = messageQueue.shift()!;
            yield value;
          }
        }
      }
    } finally {
      await subscriber.disconnect();
    }
  }

  async onModuleDestroy() {
    try {
      await this.redisPublisher.disconnect();
      await this.redisSubscriber.disconnect();
      this.logger.log('Redis connections closed');
    } catch (error) {
      this.logger.error('Error closing Redis connections:', error);
    }
  }
} 