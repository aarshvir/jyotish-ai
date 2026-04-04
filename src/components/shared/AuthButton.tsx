'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { FileText, LogOut, Menu, User } from 'lucide-react';

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose, ref]);
}

export default function AuthButton() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapRef, menuOpen, () => setMenuOpen(false));

  const handleSignOut = async () => {
    setMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (isLoading) {
    return (
      <div
        className="h-9 w-28 shrink-0 rounded-sm bg-nebula/60 animate-pulse"
        aria-busy="true"
        aria-label="Loading account"
      />
    );
  }

  const menuPanel = (
    <div
      className="absolute right-0 top-full z-[60] mt-2 min-w-[12.5rem] rounded-sm border border-horizon bg-cosmos py-1 shadow-lg"
      role="menu"
    >
      <div className="border-b border-horizon/80 pb-1">
        <Link
          href="/#how-it-works"
          className="block px-4 py-2.5 text-sm text-dust hover:bg-nebula/80 hover:text-star"
          role="menuitem"
          onClick={() => setMenuOpen(false)}
        >
          How it works
        </Link>
        <Link
          href="/pricing"
          className="block px-4 py-2.5 text-sm text-dust hover:bg-nebula/80 hover:text-star"
          role="menuitem"
          onClick={() => setMenuOpen(false)}
        >
          Pricing
        </Link>
      </div>
      {user ? (
        <>
          <Link
            href="/dashboard"
            className="block px-4 py-2.5 text-sm text-star hover:bg-nebula/80"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/onboard"
            className="block px-4 py-2.5 text-sm text-star hover:bg-nebula/80"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            New report
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-dust hover:bg-nebula/80 hover:text-star"
            role="menuitem"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="block px-4 py-2.5 text-sm text-star hover:bg-nebula/80"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="block px-4 py-2.5 text-sm text-amber hover:bg-nebula/10"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Get started
          </Link>
          <Link
            href="/onboard"
            className="block px-4 py-2.5 text-sm text-star hover:bg-nebula/80"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Get report
          </Link>
        </>
      )}
    </div>
  );

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      {/* Desktop */}
      <div className="hidden items-center gap-2 lg:flex">
        {user ? (
          <>
            <Button variant="ghost" className="gap-2 text-dust hover:text-star" asChild>
              <Link href="/dashboard">
                <User className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" className="gap-2 text-dust hover:text-star" asChild>
              <Link href="/onboard">
                <FileText className="h-4 w-4" />
                New report
              </Link>
            </Button>
            <Button variant="ghost" className="gap-2 text-dust hover:text-star" onClick={() => void handleSignOut()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-sm border border-amber/40 px-5 py-2 text-sm font-body font-medium tracking-wide text-amber transition-colors duration-200 hover:bg-amber/10"
            >
              Sign in
            </Link>
            <Link
              href="/onboard"
              className="inline-flex items-center gap-2 rounded-sm bg-amber px-5 py-2 text-sm font-body font-medium tracking-wide text-space transition-colors duration-200 hover:bg-amber-glow"
            >
              Get report
            </Link>
          </>
        )}
      </div>

      {/* Mobile / tablet compact */}
      <div className="lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="border-horizon text-star hover:bg-nebula/60"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          aria-label={user ? 'Account menu' : 'Sign in menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        {menuOpen ? menuPanel : null}
      </div>
    </div>
  );
}
