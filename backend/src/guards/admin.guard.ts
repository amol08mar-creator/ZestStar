import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '@supabase/supabase-js';

// Requires SupabaseAuthGuard to run first (req.user must already be set).
// Set admin role in Supabase: Authentication → Users → edit user → app_metadata → { "role": "admin" }
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user: User }>();
    if (req.user?.app_metadata?.['role'] !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
