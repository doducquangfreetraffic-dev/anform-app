'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-honey-light hover:bg-forest-dark rounded-lg transition disabled:opacity-50"
    >
      <LogOut className="w-3.5 h-3.5" />
      {loading ? 'Đang thoát…' : 'Đăng xuất'}
    </button>
  );
}
