'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User } from 'lucide-react';
import Link from 'next/link';

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
    return null;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button variant="ghost" className="gap-2">
            <User className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Button variant="ghost" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login">
        <Button variant="ghost">Sign In</Button>
      </Link>
      <Link href="/login?mode=signup">
        <Button>Get Started</Button>
      </Link>
    </div>
  );
}
