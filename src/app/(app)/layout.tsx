import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/whitelist';
import { LayoutDashboard, FileText, Settings, Users, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import SignOutButton from '@/components/shared/SignOutButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const role = await getUserRole(user.email);
  if (!role) redirect('/access-denied');

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Bạn';
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const initials = fullName.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-paper">
      <aside className="w-64 bg-forest text-white flex flex-col">
        <div className="p-6 border-b border-forest-dark">
          <h1 className="text-2xl font-bold">ANFORM</h1>
          <p className="text-xs text-honey-light italic mt-1">đẹp như nói chuyện</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>
            Tổng quan
          </NavLink>
          <NavLink href="/forms" icon={<FileText className="w-4 h-4" />}>
            Forms
          </NavLink>
          {role === 'admin' && (
            <>
              <NavLink href="/settings/team" icon={<Users className="w-4 h-4" />}>
                Thành viên
              </NavLink>
              <NavLink href="/settings/audit" icon={<ShieldAlert className="w-4 h-4" />}>
                Audit log
              </NavLink>
            </>
          )}
          <NavLink href="/settings" icon={<Settings className="w-4 h-4" />}>
            Cài đặt
          </NavLink>
        </nav>

        <div className="p-4 border-t border-forest-dark space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
              <AvatarFallback className="bg-honey text-forest text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs flex-1 min-w-0">
              <div className="font-medium truncate">{fullName}</div>
              <div className="text-honey-light truncate">{user.email}</div>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-forest-dark transition text-sm"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
