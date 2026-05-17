import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

type AuthRequest = Request & { user: User };

// Public routes — no auth needed
@Controller('reviews')
export class PublicReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Get('product/:productId')
  getByProduct(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviews.getByProduct(
      productId,
      page ? parseInt(page) : 1,
      limit ? Math.min(parseInt(limit), 50) : 10,
    );
  }

  @Get('product/:productId/summary')
  getSummary(@Param('productId') productId: string) {
    return this.reviews.getSummary(productId);
  }

  @Get('featured')
  getFeatured() {
    return this.reviews.getFeaturedReviews(8);
  }
}

// Auth-protected routes
@UseGuards(SupabaseAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Get('my')
  getMyReviews(@Req() req: AuthRequest) {
    return this.reviews.getByUser(req.user.id);
  }

  @Get('can-review/:productId')
  canReview(@Req() req: AuthRequest, @Param('productId') productId: string) {
    return this.reviews.canReview(req.user.id, productId);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateReviewDto) {
    return this.reviews.create(req.user.id, dto);
  }

  @Put(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.reviews.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.reviews.remove(req.user.id, id);
  }
}
