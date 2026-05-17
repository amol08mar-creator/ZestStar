import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVendorDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsString() contact_person?: string;

  @IsOptional() @IsString() phone?: string;

  @IsOptional() @IsEmail() email?: string;

  @IsOptional() @IsString() address?: string;

  @IsOptional() @IsString() gst_number?: string;

  @IsOptional() @IsBoolean() is_active?: boolean;
}
