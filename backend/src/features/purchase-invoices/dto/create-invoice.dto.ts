import {
  IsArray, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID,
  Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsUUID() @IsNotEmpty() product_id: string;

  @IsString() @IsNotEmpty() product_name: string;

  @Type(() => Number) @IsInt() @Min(1) quantity: number;

  @Type(() => Number) @IsInt() @Min(0) unit_cost: number;
}

export class CreateInvoiceDto {
  @IsOptional() @IsUUID() vendor_id?: string;

  @IsString() @IsNotEmpty() vendor_name: string;

  @IsString() @IsNotEmpty() invoice_number: string;

  @IsDateString() invoice_date: string;

  @IsOptional() @IsDateString() received_date?: string;

  @IsOptional() @IsIn(['unpaid', 'partial', 'paid']) payment_status?: 'unpaid' | 'partial' | 'paid';

  @IsOptional() @IsDateString() payment_due_date?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) tax_amount?: number;

  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsIn(['draft', 'submitted']) status?: 'draft' | 'submitted';

  @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
