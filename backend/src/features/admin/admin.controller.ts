import { Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { AdminService } from './admin.service';

@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.admin.getDashboard();
  }

  @Get('analytics')
  getAnalytics(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.admin.getAnalytics(start, end);
  }

  @Get('customers')
  getCustomers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search = '',
  ) {
    return this.admin.getCustomers(+page, +limit, search);
  }

  @Get('customers/:id')
  getCustomer(@Param('id') id: string) {
    return this.admin.getCustomer(id);
  }

  @Get('subscriptions')
  getSubscriptions() {
    return this.admin.getSubscriptions();
  }

  @Patch('subscriptions/:id/pause')
  pauseSubscription(@Param('id') id: string) {
    return this.admin.adminPause(id);
  }

  @Patch('subscriptions/:id/resume')
  resumeSubscription(@Param('id') id: string) {
    return this.admin.adminResume(id);
  }

  @Delete('subscriptions/:id')
  cancelSubscription(@Param('id') id: string) {
    return this.admin.adminCancel(id);
  }

  @Patch('subscriptions/:id/mark-delivered')
  markDelivered(@Param('id') id: string) {
    return this.admin.adminMarkDelivered(id);
  }
}
