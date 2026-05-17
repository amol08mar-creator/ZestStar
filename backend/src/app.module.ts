import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AddressesModule } from './features/addresses/addresses.module';
import { AdminModule } from './features/admin/admin.module';
import { NotificationsModule } from './features/notifications/notifications.module';
import { CoinsModule } from './features/coins/coins.module';
import { ReviewsModule } from './features/reviews/reviews.module';
import { DriversModule } from './features/drivers/drivers.module';
import { CronJobsModule } from './features/cron-jobs/cron-jobs.module';
import { ReferralModule } from './features/referral/referral.module';
import { ServiceableAreasModule } from './features/serviceable-areas/serviceable-areas.module';
import { WishlistModule } from './features/wishlist/wishlist.module';
import { SubscriptionsModule } from './features/subscriptions/subscriptions.module';
import { RecipesModule } from './features/recipes/recipes.module';
import { PurchaseInvoicesModule } from './features/purchase-invoices/purchase-invoices.module';
import { PromoModule } from './features/promo/promo.module';
import { AuthModule } from './features/auth/auth.module';
import { CategoriesModule } from './features/categories/categories.module';
import { DeliverySlotsModule } from './features/delivery-slots/delivery-slots.module';
import { OrdersModule } from './features/orders/orders.module';
import { StockMovementsModule } from './features/stock-movements/stock-movements.module';
import { ProductsModule } from './features/products/products.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    SupabaseModule,
    AuthModule,
    AddressesModule,
    ProductsModule,
    CategoriesModule,
    DeliverySlotsModule,
    OrdersModule,
    StockMovementsModule,
    PromoModule,
    NotificationsModule,
    ReviewsModule,
    CoinsModule,
    DriversModule,
    WishlistModule,
    SubscriptionsModule,
    RecipesModule,
    PurchaseInvoicesModule,
    CronJobsModule,
    ReferralModule,
    ServiceableAreasModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
