import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { PublicWishlistController, WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  controllers: [WishlistController, PublicWishlistController],
  providers: [WishlistService, SupabaseAuthGuard],
  exports: [WishlistService],
})
export class WishlistModule {}
