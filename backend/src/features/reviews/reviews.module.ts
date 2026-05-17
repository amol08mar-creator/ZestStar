import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { PublicReviewsController, ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [PublicReviewsController, ReviewsController],
  providers: [ReviewsService, SupabaseAuthGuard],
})
export class ReviewsModule {}
