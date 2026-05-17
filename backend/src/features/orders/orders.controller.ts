import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { Request } from 'express';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { AdminOrdersQueryDto } from './dto/admin-orders-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { UpdateRefundStatusDto } from './dto/update-refund-status.dto';
import { UpdateOrderItemsDto } from './dto/update-order-items.dto';
import { OrdersService } from './orders.service';

type AuthRequest = Request & { user: User };

@UseGuards(SupabaseAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateOrderDto) {
    return this.orders.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.orders.findAll(req.user.id);
  }

  @Get('reorder-suggestions')
  getReorderSuggestions(@Req() req: AuthRequest) {
    return this.orders.getReorderSuggestions(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.orders.findOne(req.user.id, id);
  }

  @Patch(':id/cancel')
  cancelOrder(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.orders.cancelByUser(req.user.id, id);
  }

  @Patch(':id/items')
  editItems(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateOrderItemsDto) {
    return this.orders.updateOrderItems(req.user.id, id, dto);
  }
}

@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private orders: OrdersService) {}

  @Get()
  findAll(@Query() query: AdminOrdersQueryDto) {
    return this.orders.findAllAdmin(query);
  }

  @Get('edit-alerts')
  getPendingEditAlerts() {
    return this.orders.getPendingEditAlerts();
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }

  @Patch(':id/payment-status')
  updatePaymentStatus(@Param('id') id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.orders.updatePaymentStatus(id, dto.payment_status);
  }

  @Patch(':id/assign-driver')
  assignDriver(@Param('id') id: string, @Body() body: { driver_id: string | null }) {
    return this.orders.assignDriver(id, body.driver_id ?? null);
  }

  @Patch(':id/refund')
  updateRefundStatus(@Param('id') id: string, @Body() dto: UpdateRefundStatusDto) {
    return this.orders.updateRefundStatus(id, dto);
  }
}
