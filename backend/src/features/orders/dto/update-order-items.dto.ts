import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class EditOrderItemDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsString()
  product_name: string;

  @IsOptional()
  @IsString()
  product_image?: string;

  @IsOptional()
  @IsString()
  product_weight?: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  @Min(0)
  unit_price: number;

  @IsInt()
  @Min(0)
  total_price: number;
}

export class UpdateOrderItemsDto {
  @ValidateNested({ each: true })
  @Type(() => EditOrderItemDto)
  items: EditOrderItemDto[];
}
