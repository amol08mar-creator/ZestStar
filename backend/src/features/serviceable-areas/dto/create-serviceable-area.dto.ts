import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateServiceableAreaDto {
  @IsString() @IsNotEmpty() @MaxLength(10) pincode: string;
  @IsOptional() @IsString() area_name?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
