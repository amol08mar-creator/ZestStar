import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { WishlistService } from './wishlist.service';

type AuthRequest = Request & { user: User };

@UseGuards(SupabaseAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private wishlist: WishlistService) {}

  @Get()
  list(@Req() req: AuthRequest) {
    return this.wishlist.list(req.user.id);
  }

  @Get('share')
  async share(@Req() req: AuthRequest) {
    const id = await this.wishlist.createShare(req.user.id);
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return {
      data: { share_url: `${frontendUrl}/wishlist/shared/${id}` },
      message: 'Share link created',
    };
  }

  @Post(':productId')
  add(@Req() req: AuthRequest, @Param('productId') productId: string) {
    return this.wishlist.add(req.user.id, productId);
  }

  @Delete(':productId')
  remove(@Req() req: AuthRequest, @Param('productId') productId: string) {
    return this.wishlist.remove(req.user.id, productId);
  }
}

@Controller('wishlist/public')
export class PublicWishlistController {
  constructor(private wishlist: WishlistService) {}

  @Get(':token')
  getShared(@Param('token') token: string) {
    return this.wishlist.getShared(token);
  }
}
