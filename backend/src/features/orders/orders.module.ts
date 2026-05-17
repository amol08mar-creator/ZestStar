import { Module } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CoinsModule } from '../coins/coins.module';
import { PromoModule } from '../promo/promo.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralModule } from '../referral/referral.module';
import { ServiceableAreasModule } from '../serviceable-areas/serviceable-areas.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { AdminOrdersController, OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [StockMovementsModule, PromoModule, CoinsModule, ReferralModule, ServiceableAreasModule, NotificationsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, SupabaseAuthGuard, AdminGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
