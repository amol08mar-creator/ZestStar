import { Module } from '@nestjs/common';
import { AdminGuard } from '../../guards/admin.guard';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { AdminServiceableAreasController, PublicServiceableAreasController } from './serviceable-areas.controller';
import { ServiceableAreasService } from './serviceable-areas.service';

@Module({
  controllers: [PublicServiceableAreasController, AdminServiceableAreasController],
  providers: [ServiceableAreasService, SupabaseAuthGuard, AdminGuard],
  exports: [ServiceableAreasService],
})
export class ServiceableAreasModule {}
