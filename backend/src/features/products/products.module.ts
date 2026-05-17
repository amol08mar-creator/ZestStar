import { Module } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { ProductsController, PublicProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [StockMovementsModule, NotificationsModule],
  controllers: [ProductsController, PublicProductsController],
  providers: [ProductsService, SupabaseAuthGuard, AdminGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
