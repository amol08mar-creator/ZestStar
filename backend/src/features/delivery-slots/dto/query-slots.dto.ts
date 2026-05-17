import { IsDateString, IsOptional } from 'class-validator';

export class QuerySlotsDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
