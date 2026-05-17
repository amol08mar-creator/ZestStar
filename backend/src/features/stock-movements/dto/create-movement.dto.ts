import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMovementDto {
  @IsUUID() product_id: string;
  @IsString() @IsIn(['purchase', 'sale', 'adjustment', 'return']) type: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() reference_id?: string;
}
