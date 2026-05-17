import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional() @IsBoolean() order_updates?: boolean;
  @IsOptional() @IsBoolean() back_in_stock?: boolean;
  @IsOptional() @IsBoolean() price_drops?: boolean;
  @IsOptional() @IsBoolean() referral_rewards?: boolean;
  @IsOptional() @IsBoolean() push_enabled?: boolean;
  @IsOptional() @IsBoolean() email_enabled?: boolean;
}
