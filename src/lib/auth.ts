import { cookies } from 'next/headers';

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('mc_auth');
  return !!(authCookie && authCookie.value === process.env.AUTH_SECRET);
}
