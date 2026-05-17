import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

type AuthRequest = Request & { user: User };

@UseGuards(SupabaseAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private svc: SubscriptionsService) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.svc.findAll(req.user.id);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateSubscriptionDto) {
    return this.svc.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.svc.update(req.user.id, id, dto);
  }

  @Patch(':id/pause')
  pause(@Req() req: AuthRequest, @Param('id') id: string, @Query('until') until?: string) {
    return this.svc.pause(req.user.id, id, until);
  }

  @Patch(':id/resume')
  resume(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.svc.resume(req.user.id, id);
  }

  @Delete(':id')
  cancel(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.svc.cancel(req.user.id, id);
  }
}
