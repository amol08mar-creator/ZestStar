import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ValidatePromoDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  items_total: number;

  @IsOptional()
  @IsArray()
  items?: { category: string; total: number }[];
}
