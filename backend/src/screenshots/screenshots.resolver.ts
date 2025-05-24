import { Resolver, Subscription, Query, Args, ObjectType, Field } from '@nestjs/graphql';
import { Injectable } from '@nestjs/common';

@ObjectType()
export class ScreenshotCaptured {
  @Field()
  id: string;

  @Field()
  image_url: string;

  @Field()
  captured_at: string;

  @Field({ nullable: true })
  activity_percent?: number;

  @Field()
  userId: string;
}

@Injectable()
@Resolver()
export class ScreenshotsResolver {
  @Query(() => String)
  health(): string {
    return 'GraphQL API is running';
  }

  @Subscription(() => ScreenshotCaptured, {
    filter: (payload, variables) => {
      // If userId is provided, only send to that user
      if (variables.userId) {
        return payload.screenshotCaptured.userId === variables.userId;
      }
      return true;
    },
  })
  screenshotCaptured(@Args('userId', { nullable: true }) userId?: string) {
    // Simple mock subscription for development
    // In production, replace with proper Redis pub/sub or WebSocket implementation
    const mockData = {
      screenshotCaptured: {
        id: 'mock-' + Date.now(),
        image_url: 'mock-screenshot.jpg',
        captured_at: new Date().toISOString(),
        activity_percent: Math.floor(Math.random() * 100),
        userId: userId || 'mock-user',
      },
    };

    // Return async iterable that yields mock data
    return (async function* () {
      yield mockData;
    })();
  }

  // Method to publish screenshot events (for future implementation)
  publishScreenshotCaptured(screenshot: any) {
    console.log('Screenshot captured event:', screenshot);
    // TODO: Implement proper pub/sub mechanism when needed
  }
} 