import { redirect } from 'next/navigation';

// The (dashboard) layout's own auth guard redirects to /login if there's
// no authenticated user once the silent-refresh check resolves — no need
// to duplicate that check here.
export default function RootPage() {
  redirect('/dashboard');
}
