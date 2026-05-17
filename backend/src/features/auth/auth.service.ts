import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  async sendOtp(phone: string) {
    const normalized = phone.startsWith('+') ? phone : `+91${phone}`;
    const { error } = await this.supabase.client.auth.signInWithOtp({ phone: normalized });
    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, token: string) {
    const normalized = phone.startsWith('+') ? phone : `+91${phone}`;
    const { data, error } = await this.supabase.client.auth.verifyOtp({
      phone: normalized,
      token,
      type: 'sms',
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException(error?.message ?? 'OTP verification failed');
    }

    const u = data.user;
    return {
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        user: {
          id: u.id,
          phone: u.phone,
          email: u.email ?? null,
          name: (u.user_metadata?.name as string) ?? null,
          is_new_user: !u.user_metadata?.name,
        },
      },
      message: 'Login successful',
    };
  }

  async getMe(userId: string) {
    const { data, error } = await this.supabase.admin.auth.admin.getUserById(userId);
    if (error) throw new BadRequestException(error.message);

    const u = data.user;
    return {
      data: {
        id: u.id,
        phone: u.phone,
        email: u.email ?? null,
        name: (u.user_metadata?.name as string) ?? null,
        created_at: u.created_at,
      },
      message: 'Success',
    };
  }

  async updateProfile(userId: string, name: string, email?: string) {
    const { data, error } = await this.supabase.admin.auth.admin.updateUserById(userId, {
      user_metadata: { name },
      ...(email ? { email } : {}),
    });
    if (error) throw new BadRequestException(error.message);

    const u = data.user;
    return {
      data: {
        id: u.id,
        phone: u.phone,
        email: u.email ?? null,
        name: (u.user_metadata?.name as string) ?? null,
      },
      message: 'Profile updated',
    };
  }

  async sendEmailOtp(email: string) {
    // Dev mode: skip email — user enters static PIN 123456 on the verify screen
    if (process.env.NODE_ENV !== 'production') {
      return { data: null, message: 'dev' };
    }

    const redirectTo = `${process.env.FRONTEND_URL}/auth/callback`;

    const { data, error } = await this.supabase.admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    });
    if (error) throw new BadRequestException(error.message);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ZestStar <info@zeststar.in>',
        to: email,
        subject: 'Your sign-in link for ZestStar',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="color:#2E7D32;margin-bottom:4px">ZestStar</h2>
            <p style="color:#555;margin-bottom:28px;font-size:15px">Click the button below to sign in instantly.</p>
            <a href="${data.properties.action_link}"
               style="display:inline-block;background:#2E7D32;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">
              Sign In to ZestStar
            </a>
            <p style="color:#999;font-size:13px;margin-top:28px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
          </div>`,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new BadRequestException((body as { message?: string }).message ?? 'Failed to send email');
    }

    return { data: null, message: 'Magic link sent to email' };
  }

  async verifyEmailOtp(email: string, token: string) {
    let otpToken = token;

    // Dev bypass: static PIN 123456 generates a real session without requiring email
    if (token === '123456' && process.env.NODE_ENV !== 'production') {
      const { data: linkData, error: linkError } = await this.supabase.admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
      if (linkError) throw new UnauthorizedException(linkError.message);
      otpToken = linkData.properties.email_otp;
    }

    const { data, error } = await this.supabase.client.auth.verifyOtp({
      email,
      token: otpToken,
      type: 'email',
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException(error?.message ?? 'OTP verification failed');
    }

    const u = data.user;
    return {
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        user: {
          id: u.id,
          phone: u.phone ?? null,
          email: u.email ?? null,
          name: (u.user_metadata?.name as string) ?? null,
          is_new_user: !u.user_metadata?.name,
        },
      },
      message: 'Login successful',
    };
  }

  async refreshToken(refreshToken: string) {
    const { data, error } = await this.supabase.client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException(error?.message ?? 'Token refresh failed');
    }

    return {
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
      },
      message: 'Token refreshed',
    };
  }

  async logout(token: string) {
    // Invalidate the JWT on Supabase's side so it can't be reused
    const { error } = await this.supabase.admin.auth.admin.signOut(token);
    if (error) throw new BadRequestException(error.message);
    return { data: null, message: 'Logged out successfully' };
  }
}
