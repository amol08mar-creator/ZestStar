import { Module } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { AdminRecipesController, PublicRecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({
  controllers: [PublicRecipesController, AdminRecipesController],
  providers: [RecipesService, SupabaseAuthGuard, AdminGuard],
  exports: [RecipesService],
})
export class RecipesModule {}
