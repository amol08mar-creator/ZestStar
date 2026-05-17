import { Body, Controller, Get, Put, Query, Req, UseGuards } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { Request } from 'express';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CoinsService } from './coins.service';

type AuthRequest = Request & { user: User };

// Public — no auth needed
@Controller('coins')
export class PublicCoinsController {
  constructor(private coins: CoinsService) {}

  @Get('status')
  async status() {
    const result = await this.coins.checkTablesExist();
    const ready = result.wallet && result.ledger;
    return { data: result, message: ready ? 'Ready' : 'Tables missing — run DB migration' };
  }

  @Get('loyalty-config')
  async getLoyaltyConfig() {
    const tiers = await this.coins.getLoyaltyConfig();
    return { data: { tiers }, message: 'Success' };
  }
}

@UseGuards(SupabaseAuthGuard)
@Controller('coins')
export class CoinsController {
  constructor(private coins: CoinsService) {}

  @Get('balance')
  async getBalance(@Req() req: AuthRequest) {
    const wallet = await this.coins.getWallet(req.user.id);
    return { data: wallet, message: 'Success' };
  }

  @Get('history')
  getHistory(@Req() req: AuthRequest, @Query('page') page?: string) {
    return this.coins.getHistory(req.user.id, page ? Math.max(1, parseInt(page)) : 1);
  }
}

@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin/loyalty-config')
export class AdminLoyaltyConfigController {
  constructor(private coins: CoinsService) {}

  @Get()
  async get() {
    const tiers = await this.coins.getLoyaltyConfig();
    return { data: { tiers }, message: 'Success' };
  }

  @Put()
  async update(@Body() body: { tiers: { tier: string; min_spend: number; coin_rate: number }[] }) {
    const tiers = await this.coins.updateLoyaltyConfig(body.tiers);
    return { data: { tiers }, message: 'Loyalty config updated' };
  }
}
