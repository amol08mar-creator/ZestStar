import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RedeemCoinsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  coins_to_spend: number;
}
