import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDriverDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsOptional() @IsString() @IsIn(['bike', 'scooter', 'car']) vehicle_type?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class UpdateDriverDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @IsIn(['bike', 'scooter', 'car']) vehicle_type?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
