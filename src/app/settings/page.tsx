import { redirect } from 'next/navigation';

/** Account settings live on the dashboard tab — keep the old URL working. */
export default function SettingsRedirect() {
  redirect('/dashboard?tab=settings');
}
