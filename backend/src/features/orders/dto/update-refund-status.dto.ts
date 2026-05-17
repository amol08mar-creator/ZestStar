import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRefundStatusDto {
  @IsIn(['pending', 'processing', 'completed'])
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;
}
