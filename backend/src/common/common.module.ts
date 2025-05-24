import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { ImageService } from './image.service';

@Module({
  providers: [SupabaseService, ImageService],
  exports: [SupabaseService, ImageService],
})
export class CommonModule {} 