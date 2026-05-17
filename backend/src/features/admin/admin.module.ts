import { Module } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [AdminController],
  providers: [AdminService, SupabaseAuthGuard, AdminGuard],
})
export class AdminModule {}
