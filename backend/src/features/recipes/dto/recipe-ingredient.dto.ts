import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeIngredientDto {
  @IsUUID() @IsNotEmpty() product_id: string;

  @Type(() => Number) @IsInt() @Min(1) quantity: number;

  @IsOptional() @IsString() display_quantity?: string;
}

export class SetIngredientsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => RecipeIngredientDto)
  items: RecipeIngredientDto[];
}
