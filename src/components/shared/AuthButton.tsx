'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { FileText, LogOut, User } from 'lucide-react';

/*
 * Auth links for the Navbar's mobile menu panel. Rendered by Navbar (which
 * owns the single mobile hamburger) so mobile users get explicit controls
 * instead of a second nested menu icon.
 */
export function MobileAuthLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    onNavigate?.();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (isLoading) {
    return (
      <div
        className="h-11 w-full rounded-button bg-nebula/60 skeleton"
        role="status"
        aria-busy="true"
        aria-label="Loading account"
      />
    );
  }

  if (user) {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="btn-primary w-full text-body-sm px-6 py-3"
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="flex items-center justify-center gap-2 py-2 font-body text-body-md text-dust hover:text-star transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/onboard?plan=free"
        rel="nofollow"
        onClick={onNavigate}
        className="btn-primary w-full text-body-sm px-6 py-3"
      >
        Get your free Kundli
      </Link>
      <Link
        href="/login"
        onClick={onNavigate}
        className="py-2 text-center font-body text-body-md text-dust hover:text-star transition-colors"
      >
        Sign in
      </Link>
    </div>
  );
}

export default function AuthButton() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (isLoading) {
    return (
      <div
        className="h-9 w-28 shrink-0 rounded-button bg-nebula/60 skeleton"
        role="status"
        aria-busy="true"
        aria-label="Loading account"
      />
    );
  }

  return (
    <div className="relative shrink-0">
      {/* Desktop */}
      <div className="hidden items-center gap-2 lg:flex">
        {user ? (
          <>
            <Button variant="ghost" className="gap-2 text-dust hover:text-star text-body-sm" asChild>
              <Link href="/dashboard">
                <User className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" className="gap-2 text-dust hover:text-star text-body-sm" asChild>
              <Link href="/onboard">
                <FileText className="h-4 w-4" />
                New report
              </Link>
            </Button>
            <Button variant="ghost" className="gap-2 text-dust hover:text-star text-body-sm" onClick={() => void handleSignOut()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="btn-secondary text-body-sm px-5 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/onboard"
              className="btn-primary text-body-sm px-5 py-2"
            >
              Get report
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
