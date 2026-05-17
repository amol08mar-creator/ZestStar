import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller('admin')
export class PurchaseInvoicesController {
  constructor(private svc: PurchaseInvoicesService) {}

  // Vendors
  @Get('vendors')
  listVendors() {
    return this.svc.listVendors();
  }

  @Post('vendors')
  createVendor(@Body() dto: CreateVendorDto) {
    return this.svc.createVendor(dto);
  }

  @Put('vendors/:id')
  updateVendor(@Param('id') id: string, @Body() dto: CreateVendorDto) {
    return this.svc.updateVendor(id, dto);
  }

  // Purchase Invoices
  @Get('purchase-invoices')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('payment_status') payment_status?: string,
    @Query('status') status?: string,
    @Query('vendor_id') vendor_id?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
  ) {
    return this.svc.findAll({ page: page ? +page : 1, limit: limit ? +limit : 20, payment_status, status, vendor_id, date_from, date_to });
  }

  @Post('purchase-invoices')
  create(@Body() dto: CreateInvoiceDto) {
    return this.svc.createInvoice(dto);
  }

  @Get('purchase-invoices/:id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Put('purchase-invoices/:id')
  updateDraft(@Param('id') id: string, @Body() dto: CreateInvoiceDto) {
    return this.svc.updateDraft(id, dto);
  }

  @Patch('purchase-invoices/:id/payment')
  updatePayment(@Param('id') id: string, @Body('payment_status') paymentStatus: 'unpaid' | 'partial' | 'paid') {
    return this.svc.updatePaymentStatus(id, paymentStatus);
  }

  @Patch('purchase-invoices/:id/submit')
  submitDraft(@Param('id') id: string) {
    return this.svc.submitDraft(id);
  }

  @Patch('purchase-invoices/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.svc.cancelInvoice(id);
  }
}
