import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePromoDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsIn(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  value: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_order_amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_uses?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsDateString()
  valid_until?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_uses_per_customer?: number;

  @IsOptional()
  @IsBoolean()
  first_order_only?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicable_categories?: string[];

  @IsOptional()
  @IsBoolean()
  auto_apply?: boolean;
}
