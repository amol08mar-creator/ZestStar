import { IsEmail, IsString, MinLength } from 'class-validator';

export class VerifyEmailOtpDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @IsString()
  @MinLength(1)
  token: string;
}
