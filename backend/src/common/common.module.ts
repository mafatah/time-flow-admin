import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { ImageService } from './image.service';
import { PubSubService } from './pubsub.service';

@Module({
  providers: [SupabaseService, ImageService, PubSubService],
  exports: [SupabaseService, ImageService, PubSubService],
})
export class CommonModule {} 