'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  role: z.enum(['admin', 'member']),
});

type FormValues = z.infer<typeof schema>;

export default function AddMemberForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'member' },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Thêm thất bại');
        return;
      }
      toast.success(`Đã thêm ${values.email}`);
      reset({ email: '', role: 'member' });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi mạng');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="email" className="text-xs">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="ten@example.com"
          autoComplete="off"
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="role" className="text-xs">
          Vai trò
        </Label>
        <select
          id="role"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          {...register('role')}
        >
          <option value="member">Thành viên</option>
          <option value="admin">Quản trị</option>
        </select>
      </div>

      <Button type="submit" disabled={submitting} className="bg-forest hover:bg-forest-dark">
        <UserPlus className="w-4 h-4" />
        {submitting ? 'Đang thêm…' : 'Thêm'}
      </Button>
    </form>
  );
}
