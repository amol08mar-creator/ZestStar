import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSlotDto {
  @IsDateString()
  date: string;

  @IsString()
  time_start: string;

  @IsString()
  time_end: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

export class GenerateSlotDto {
  @IsDateString()
  date: string;
}
