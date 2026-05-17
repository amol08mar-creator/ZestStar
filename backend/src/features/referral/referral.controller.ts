import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { ApplyReferralDto } from './dto/apply-referral.dto';
import { ReferralService } from './referral.service';

@Controller('referral')
@UseGuards(SupabaseAuthGuard)
export class ReferralController {
  constructor(private referral: ReferralService) {}

  @Get('stats')
  getStats(@Req() req: Request & { user: { id: string } }) {
    return this.referral.getStats(req.user.id);
  }

  @Post('apply')
  applyCode(@Req() req: Request & { user: { id: string } }, @Body() dto: ApplyReferralDto) {
    return this.referral.applyCode(req.user.id, dto.code);
  }
}
