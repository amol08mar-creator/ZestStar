import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubscriptionDto {
  @IsUUID() @IsNotEmpty() product_id: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(20) quantity: number;

  @IsString() @IsNotEmpty() delivery_address: string;

  @IsOptional() @IsString() delivery_landmark?: string;

  @IsIn(['daily', 'weekly', 'monthly']) frequency: 'daily' | 'weekly' | 'monthly';

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(28) frequency_day?: number;

  @IsOptional() @IsDateString() start_date?: string;

  @IsOptional() @IsString() preferred_time_start?: string;

  @IsOptional() @IsString() preferred_time_end?: string;
}
