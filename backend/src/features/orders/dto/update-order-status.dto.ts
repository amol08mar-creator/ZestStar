import { IsIn, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'])
  status: string;
}
