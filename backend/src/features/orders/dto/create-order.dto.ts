import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsOptional() @IsString() product_id?: string;
  @IsString() @IsNotEmpty() product_name: string;
  @IsOptional() @IsString() product_image?: string;
  @IsOptional() @IsString() product_weight?: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsInt() @Min(0) unit_price: number;
  @Type(() => Number) @IsInt() @Min(0) total_price: number;
}

export class CreateOrderDto {
  @IsString() @IsNotEmpty() delivery_address: string;
  @IsOptional() @IsString() delivery_landmark?: string;
  @Type(() => Number) @IsInt() @Min(0) items_total: number;
  @Type(() => Number) @IsInt() @Min(0) delivery_fee: number;
  @Type(() => Number) @IsInt() @Min(0) final_total: number;
  @IsOptional() @IsString() promo_code?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) discount_amount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) coins_redeemed?: number;
  @IsOptional() @IsUUID() delivery_slot_id?: string;
  @IsOptional() @IsString() @MaxLength(10) delivery_pincode?: string;
  @IsOptional() @IsString() @MaxLength(200) delivery_instructions?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto) items: CreateOrderItemDto[];
}
