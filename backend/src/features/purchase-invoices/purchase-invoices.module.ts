import { Module } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { PurchaseInvoicesController } from './purchase-invoices.controller';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@Module({
  imports: [StockMovementsModule, NotificationsModule],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService, SupabaseAuthGuard, AdminGuard],
  exports: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
