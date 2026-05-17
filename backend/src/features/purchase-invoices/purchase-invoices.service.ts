import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    private supabase: SupabaseService,
    private stockMovements: StockMovementsService,
    private notifications: NotificationsService,
  ) {}

  // ── Vendor Methods ────────────────────────────────────────────

  async listVendors() {
    const { data, error } = await this.supabase.admin
      .from('vendors')
      .select('*')
      .order('name');
    if (error) throw new BadRequestException(error.message);
    return { data: { vendors: data ?? [] }, message: 'Success' };
  }

  async createVendor(dto: CreateVendorDto) {
    const { data, error } = await this.supabase.admin
      .from('vendors')
      .insert({
        name: dto.name,
        contact_person: dto.contact_person ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        gst_number: dto.gst_number ?? null,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { data: { vendor: data }, message: 'Vendor created' };
  }

  async updateVendor(id: string, dto: CreateVendorDto) {
    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.contact_person !== undefined) updates.contact_person = dto.contact_person;
    if (dto.phone !== undefined) updates.phone = dto.phone;
    if (dto.email !== undefined) updates.email = dto.email;
    if (dto.address !== undefined) updates.address = dto.address;
    if (dto.gst_number !== undefined) updates.gst_number = dto.gst_number;
    if (dto.is_active !== undefined) updates.is_active = dto.is_active;

    const { data, error } = await this.supabase.admin
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return { data: { vendor: data }, message: 'Vendor updated' };
  }

  // ── Invoice Methods ───────────────────────────────────────────

  async findAll(filters: {
    page?: number;
    limit?: number;
    payment_status?: string;
    status?: string;
    vendor_id?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const limit = Math.min(parseInt(String(filters.limit ?? 20)), 100);
    const page = Math.max(parseInt(String(filters.page ?? 1)), 1);
    const offset = (page - 1) * limit;

    let query = this.supabase.admin
      .from('purchase_invoices')
      .select('*, purchase_invoice_items(id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.payment_status) query = query.eq('payment_status', filters.payment_status);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.vendor_id) query = query.eq('vendor_id', filters.vendor_id);
    if (filters.date_from) query = query.gte('invoice_date', filters.date_from);
    if (filters.date_to) query = query.lte('invoice_date', filters.date_to);

    const { data, error, count } = await query;
    if (error) throw new BadRequestException(error.message);

    const invoices = (data ?? []).map((inv: Record<string, unknown>) => ({
      ...inv,
      item_count: Array.isArray(inv.purchase_invoice_items) ? inv.purchase_invoice_items.length : 0,
      purchase_invoice_items: undefined,
    }));

    return { data: { invoices, total: count ?? 0, page, limit }, message: 'Success' };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('purchase_invoices')
      .select('*, purchase_invoice_items(*, products(name, image_url, weight))')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('Invoice not found');
    return { data: { invoice: data }, message: 'Success' };
  }

  async createInvoice(dto: CreateInvoiceDto) {
    const status = dto.status ?? 'submitted';
    const taxAmount = dto.tax_amount ?? 0;
    const subtotal = dto.items.reduce((sum, i) => sum + i.unit_cost * i.quantity, 0);
    const totalAmount = subtotal + taxAmount;

    // Insert invoice header
    const { data: invoice, error: invErr } = await this.supabase.admin
      .from('purchase_invoices')
      .insert({
        invoice_number: dto.invoice_number,
        vendor_id: dto.vendor_id ?? null,
        vendor_name: dto.vendor_name,
        invoice_date: dto.invoice_date,
        received_date: dto.received_date ?? null,
        payment_status: dto.payment_status ?? 'unpaid',
        payment_due_date: dto.payment_due_date ?? null,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: dto.notes ?? null,
        status,
      })
      .select()
      .single();

    if (invErr) throw new BadRequestException(invErr.message);

    // Insert line items
    if (dto.items.length > 0) {
      const itemRows = dto.items.map((i) => ({
        purchase_invoice_id: invoice.id,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
        total_cost: i.unit_cost * i.quantity,
      }));

      const { error: itemErr } = await this.supabase.admin
        .from('purchase_invoice_items')
        .insert(itemRows);

      if (itemErr) throw new BadRequestException(itemErr.message);
    }

    // Update stock only for submitted invoices (not draft)
    if (status === 'submitted') {
      await this.applyStockChanges(dto.items, dto.invoice_number, dto.vendor_name, invoice.id, 'increment');
    }

    return { data: { invoice }, message: status === 'submitted' ? 'Invoice submitted and stock updated' : 'Draft saved' };
  }

  async updateDraft(id: string, dto: CreateInvoiceDto) {
    const { data: existing, error: fetchErr } = await this.supabase.admin
      .from('purchase_invoices')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) throw new NotFoundException('Invoice not found');
    if (existing.status !== 'draft') throw new BadRequestException('Only draft invoices can be edited');

    const taxAmount = dto.tax_amount ?? 0;
    const subtotal = dto.items.reduce((sum, i) => sum + i.unit_cost * i.quantity, 0);
    const totalAmount = subtotal + taxAmount;

    const { data: updated, error: updateErr } = await this.supabase.admin
      .from('purchase_invoices')
      .update({
        vendor_id: dto.vendor_id ?? null,
        vendor_name: dto.vendor_name,
        invoice_number: dto.invoice_number,
        invoice_date: dto.invoice_date,
        received_date: dto.received_date ?? null,
        payment_status: dto.payment_status ?? 'unpaid',
        payment_due_date: dto.payment_due_date ?? null,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: dto.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw new BadRequestException(updateErr.message);

    await this.supabase.admin.from('purchase_invoice_items').delete().eq('purchase_invoice_id', id);

    if (dto.items.length > 0) {
      const itemRows = dto.items.map((i) => ({
        purchase_invoice_id: id,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
        total_cost: i.unit_cost * i.quantity,
      }));
      const { error: itemErr } = await this.supabase.admin.from('purchase_invoice_items').insert(itemRows);
      if (itemErr) throw new BadRequestException(itemErr.message);
    }

    return { data: { invoice: updated }, message: 'Draft updated' };
  }

  async updatePaymentStatus(id: string, paymentStatus: 'unpaid' | 'partial' | 'paid') {
    const { data, error } = await this.supabase.admin
      .from('purchase_invoices')
      .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return { data: { invoice: data }, message: 'Payment status updated' };
  }

  async submitDraft(id: string) {
    const { data: invoice, error: fetchErr } = await this.supabase.admin
      .from('purchase_invoices')
      .select('status, invoice_number, vendor_name, purchase_invoice_items(product_id, product_name, quantity, unit_cost)')
      .eq('id', id)
      .single();

    if (fetchErr || !invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'draft') throw new BadRequestException('Only draft invoices can be submitted');

    const { data: updated, error } = await this.supabase.admin
      .from('purchase_invoices')
      .update({ status: 'submitted', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    const items = (invoice.purchase_invoice_items as { product_id: string; product_name: string; quantity: number; unit_cost: number }[]) ?? [];
    await this.applyStockChanges(items, invoice.invoice_number, invoice.vendor_name, id, 'increment');

    return { data: { invoice: updated }, message: 'Invoice submitted and stock updated' };
  }

  async cancelInvoice(id: string) {
    const { data: invoice, error: fetchErr } = await this.supabase.admin
      .from('purchase_invoices')
      .select('status, invoice_number, vendor_name, purchase_invoice_items(product_id, product_name, quantity, unit_cost)')
      .eq('id', id)
      .single();

    if (fetchErr || !invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'cancelled') throw new BadRequestException('Invoice already cancelled');

    const { error } = await this.supabase.admin
      .from('purchase_invoices')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    // Reverse stock only if invoice was submitted (not draft)
    if (invoice.status === 'submitted') {
      const items = (invoice.purchase_invoice_items as { product_id: string; product_name: string; quantity: number; unit_cost: number }[]) ?? [];
      await this.applyStockChanges(items, invoice.invoice_number, invoice.vendor_name, id, 'decrement');
    }

    return { data: null, message: 'Invoice cancelled and stock reversed' };
  }

  // ── Private helpers ────────────────────────────────────────────

  private async applyStockChanges(
    items: { product_id: string; product_name: string; quantity: number; unit_cost: number }[],
    invoiceNumber: string,
    vendorName: string,
    invoiceId: string,
    direction: 'increment' | 'decrement',
  ) {
    for (const item of items) {
      const { data: product } = await this.supabase.admin
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .maybeSingle();

      const currentStock = (product as { stock?: number } | null)?.stock ?? 0;
      const newStock = direction === 'increment'
        ? currentStock + item.quantity
        : Math.max(0, currentStock - item.quantity);

      await this.supabase.admin
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', item.product_id);

      // Trigger back-in-stock notifications when stock goes from 0 to positive
      if (direction === 'increment' && currentStock === 0 && newStock > 0) {
        this.notifications.triggerStockNotification(item.product_id).catch(() => {});
      }

      const movementType = direction === 'increment' ? 'purchase' : 'adjustment';
      const note = direction === 'increment'
        ? `Invoice #${invoiceNumber} from ${vendorName}`
        : `Cancelled Invoice #${invoiceNumber} (reversed)`;

      await this.stockMovements.log(item.product_id, movementType, item.quantity, note, invoiceId);
    }
  }
}
