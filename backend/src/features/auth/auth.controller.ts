import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { User } from '@supabase/supabase-js';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { AuthService } from './auth.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendEmailOtpDto } from './dto/send-email-otp.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

type AuthRequest = Request & { user: User };

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('otp/send')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto.phone);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.token);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('email/send')
  sendEmailOtp(@Body() dto: SendEmailOtpDto) {
    return this.auth.sendEmailOtp(dto.email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('email/verify')
  verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.auth.verifyEmailOtp(dto.email, dto.token);
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  getMe(@Req() req: AuthRequest) {
    return this.auth.getMe(req.user.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('profile')
  updateProfile(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(req.user.id, dto.name, dto.email);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshToken(dto.refresh_token);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('logout')
  logout(@Req() req: AuthRequest, @Headers('authorization') auth: string) {
    const token = auth.replace('Bearer ', '');
    return this.auth.logout(token);
  }
}
