import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRecipeDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsString() image_url?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) servings?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) prep_time_minutes?: number;

  @IsOptional() @IsIn(['easy', 'medium', 'hard']) difficulty?: 'easy' | 'medium' | 'hard';

  @IsOptional() @IsString() cuisine_type?: string;

  @IsOptional() @IsBoolean() is_active?: boolean;
}
