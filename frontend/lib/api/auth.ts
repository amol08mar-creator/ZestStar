const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  is_new_user?: boolean;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle(res: Response) {
  const json = await res.json();
  if (!res.ok) {
    const validation = json?.details?.validation;
    const msg = Array.isArray(validation) && validation.length > 0
      ? validation.join(', ')
      : (json?.details?.reason ?? json?.error ?? json?.message ?? 'Request failed');
    throw new Error(msg);
  }
  return json;
}

export async function sendOtp(phone: string): Promise<void> {
  const res = await fetch(`${API}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  await handle(res);
}

export async function verifyOtp(phone: string, token: string): Promise<Session> {
  const res = await fetch(`${API}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, token }),
  });
  const json = await handle(res);
  return json.data as Session;
}

export async function updateProfile(accessToken: string, name: string, email?: string): Promise<AuthUser> {
  const res = await fetch(`${API}/auth/profile`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ name, ...(email ? { email } : {}) }),
  });
  const json = await handle(res);
  return json.data as AuthUser;
}

export async function sendEmailOtp(email: string): Promise<void> {
  const res = await fetch(`${API}/auth/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  await handle(res);
}

export async function verifyEmailOtp(email: string, token: string): Promise<Session> {
  const res = await fetch(`${API}/auth/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token }),
  });
  const json = await handle(res);
  return json.data as Session;
}

export async function logout(accessToken: string): Promise<void> {
  await fetch(`${API}/auth/logout`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  }).catch(() => {});
}
