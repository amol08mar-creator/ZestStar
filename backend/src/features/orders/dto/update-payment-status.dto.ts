import { IsIn, IsString } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsString()
  @IsIn(['pending', 'collected', 'failed'])
  payment_status: string;
}
