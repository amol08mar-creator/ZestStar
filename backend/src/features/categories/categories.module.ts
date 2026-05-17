import { Module } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CategoriesController, PublicCategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController, PublicCategoriesController],
  providers: [CategoriesService, SupabaseAuthGuard, AdminGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
