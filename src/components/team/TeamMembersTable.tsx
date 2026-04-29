'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, Shield, ShieldOff, Pause, Play } from 'lucide-react';

export interface TeamMemberRow {
  email: string;
  role: 'admin' | 'member';
  status: 'active' | 'suspended';
  added_at: string;
  last_login_at: string | null;
  notes: string | null;
}

export default function TeamMembersTable({
  initialMembers,
  currentEmail,
}: {
  initialMembers: TeamMemberRow[];
  currentEmail: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  async function patch(email: string, body: Partial<Pick<TeamMemberRow, 'role' | 'status'>>) {
    setBusyEmail(email);
    const previous = members;
    setMembers((rows) => rows.map((m) => (m.email === email ? { ...m, ...body } : m)));
    try {
      const res = await fetch(`/api/team/members/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMembers(previous);
        toast.error(json.error || 'Cập nhật thất bại');
        return;
      }
      toast.success('Đã cập nhật');
      startTransition(() => router.refresh());
    } catch (e) {
      setMembers(previous);
      toast.error(e instanceof Error ? e.message : 'Lỗi mạng');
    } finally {
      setBusyEmail(null);
    }
  }

  async function remove(email: string) {
    setBusyEmail(email);
    const previous = members;
    setMembers((rows) => rows.filter((m) => m.email !== email));
    try {
      const res = await fetch(`/api/team/members/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMembers(previous);
        toast.error(json.error || 'Xóa thất bại');
        return;
      }
      toast.success(`Đã xóa ${email}`);
      startTransition(() => router.refresh());
    } catch (e) {
      setMembers(previous);
      toast.error(e instanceof Error ? e.message : 'Lỗi mạng');
    } finally {
      setBusyEmail(null);
      setConfirmDelete(null);
    }
  }

  if (members.length === 0) {
    return (
      <Card className="border-dashed border-2 border-soft-line bg-surface">
        <CardContent className="py-12 text-center text-sm text-muted-brand">
          Chưa có thành viên nào.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Vai trò</TableHead>
                <TableHead className="text-xs">Trạng thái</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Đăng nhập gần nhất</TableHead>
                <TableHead className="text-xs text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const isSelf = m.email === currentEmail;
                const isBusy = busyEmail === m.email || pending;
                return (
                  <TableRow key={m.email} className={m.status === 'suspended' ? 'opacity-60' : ''}>
                    <TableCell className="text-sm font-medium">
                      {m.email}
                      {isSelf && <span className="ml-2 text-xs text-muted-brand">(bạn)</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.role === 'admin' ? 'default' : 'secondary'}
                        className={m.role === 'admin' ? 'bg-forest text-white' : ''}
                      >
                        {m.role === 'admin' ? 'Quản trị' : 'Thành viên'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'active' ? 'outline' : 'destructive'}>
                        {m.status === 'active' ? 'Hoạt động' : 'Tạm ngừng'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-brand whitespace-nowrap">
                      {m.last_login_at ? new Date(m.last_login_at).toLocaleString('vi-VN') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSelf || isBusy}
                          title={m.role === 'admin' ? 'Hạ xuống thành viên' : 'Nâng lên quản trị'}
                          onClick={() =>
                            patch(m.email, { role: m.role === 'admin' ? 'member' : 'admin' })
                          }
                        >
                          {m.role === 'admin' ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSelf || isBusy}
                          title={m.status === 'active' ? 'Tạm ngừng' : 'Kích hoạt lại'}
                          onClick={() =>
                            patch(m.email, {
                              status: m.status === 'active' ? 'suspended' : 'active',
                            })
                          }
                        >
                          {m.status === 'active' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSelf || isBusy}
                          title="Xóa"
                          onClick={() => setConfirmDelete(m.email)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa thành viên?</DialogTitle>
            <DialogDescription>
              Email <span className="font-medium text-ink">{confirmDelete}</span> sẽ không thể đăng nhập ANFORM nữa.
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={busyEmail !== null}
              onClick={() => confirmDelete && remove(confirmDelete)}
            >
              {busyEmail ? 'Đang xóa…' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
