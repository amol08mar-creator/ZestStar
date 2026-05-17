import { IsIn, IsOptional, IsString } from 'class-validator';

export class AdminOrdersQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['', 'placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['', 'pending', 'collected', 'failed'])
  payment_status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['', 'pending', 'processing', 'completed', 'not_applicable'])
  refund_status?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
