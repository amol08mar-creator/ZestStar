import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationsService } from './notifications.service';

type AuthRequest = Request & { user: User };

@UseGuards(SupabaseAuthGuard)
@Controller('notifications/stock')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@Req() req: AuthRequest) {
    return this.notifications.listByUser(req.user.id).then((ids) => ({
      data: { product_ids: ids },
      message: 'Success',
    }));
  }

  @Post(':productId')
  subscribe(@Req() req: AuthRequest, @Param('productId') productId: string) {
    return this.notifications.subscribe(req.user.id, productId);
  }

  @Delete(':productId')
  unsubscribe(@Req() req: AuthRequest, @Param('productId') productId: string) {
    return this.notifications.unsubscribe(req.user.id, productId);
  }

  @Post('push/save')
  savePush(
    @Req() req: AuthRequest,
    @Body() body: { endpoint: string; p256dh: string; auth: string },
  ) {
    return this.notifications.savePushSubscription(
      req.user.id,
      body.endpoint,
      body.p256dh,
      body.auth,
    );
  }

  @Delete('push/remove')
  removePush(@Req() req: AuthRequest, @Body() body: { endpoint: string }) {
    return this.notifications.removePushSubscription(req.user.id, body.endpoint);
  }
}

@UseGuards(SupabaseAuthGuard)
@Controller('notifications')
export class NotificationsCentreController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@Req() req: AuthRequest, @Query('page') page?: string) {
    return this.notifications.listForUser(req.user.id, page ? parseInt(page) : 1);
  }

  @Get('unread-count')
  unreadCount(@Req() req: AuthRequest) {
    return this.notifications.getUnreadCount(req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: AuthRequest) {
    return this.notifications.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.notifications.markRead(req.user.id, id);
  }

  @Get('preferences')
  getPreferences(@Req() req: AuthRequest) {
    return this.notifications.getPreferences(req.user.id);
  }

  @Put('preferences')
  updatePreferences(@Req() req: AuthRequest, @Body() dto: UpdatePreferencesDto) {
    return this.notifications.updatePreferences(req.user.id, dto);
  }
}
