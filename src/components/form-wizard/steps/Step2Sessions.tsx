'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import type { FormBrief, SessionItem } from '@/types/form-brief';

function newSession(idx: number): SessionItem {
  return {
    id: `s${Date.now()}-${idx}`,
    title: `Buổi ${idx + 1}`,
    date: '',
    time: '20:00 - 21:30',
    speaker: '',
    location: 'Zoom',
    description: '',
  };
}

export default function Step2Sessions({
  brief,
  update,
}: {
  brief: FormBrief;
  update: (p: Partial<FormBrief>) => void;
}) {
  function addSession() {
    update({ sessions: [...brief.sessions, newSession(brief.sessions.length)] });
  }

  function patch(id: string, p: Partial<SessionItem>) {
    update({ sessions: brief.sessions.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  }

  function remove(id: string) {
    update({ sessions: brief.sessions.filter((s) => s.id !== id) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-forest">Các buổi học / sự kiện</h2>
        <p className="text-sm text-muted-brand mt-1">
          Thêm 1 hoặc nhiều buổi. Học viên có thể chọn 1 hoặc nhiều buổi (cài ở Bước 5).
        </p>
      </div>

      <div className="space-y-4">
        {brief.sessions.map((s, i) => (
          <div key={s.id} className="border border-soft-line rounded-xl p-4 space-y-3 bg-surface">
            <div className="flex justify-between items-start">
              <span className="text-xs uppercase tracking-wide text-honey font-semibold">
                Buổi {i + 1}
              </span>
              <button
                onClick={() => remove(s.id)}
                className="text-red-500 hover:text-red-700"
                aria-label="Xoá buổi"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tiêu đề buổi</Label>
                <Input
                  value={s.title}
                  onChange={(e) => patch(s.id, { title: e.target.value })}
                  placeholder="VD: Anh Duy Trọng — AI làm content"
                />
              </div>
              <div>
                <Label className="text-xs">Diễn giả</Label>
                <Input
                  value={s.speaker ?? ''}
                  onChange={(e) => patch(s.id, { speaker: e.target.value })}
                  placeholder="Tên diễn giả"
                />
              </div>
              <div>
                <Label className="text-xs">Ngày</Label>
                <Input
                  type="date"
                  value={s.date}
                  onChange={(e) => patch(s.id, { date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Giờ</Label>
                <Input
                  value={s.time}
                  onChange={(e) => patch(s.id, { time: e.target.value })}
                  placeholder="20:00 - 21:30"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Địa điểm / Link</Label>
                <Input
                  value={s.location ?? ''}
                  onChange={(e) => patch(s.id, { location: e.target.value })}
                  placeholder="VD: Zoom — link gửi qua email"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Mô tả ngắn (tuỳ chọn)</Label>
                <Textarea
                  rows={2}
                  value={s.description ?? ''}
                  onChange={(e) => patch(s.id, { description: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={addSession}
        className="w-full border-dashed border-2 border-honey/40 text-honey hover:bg-honey/10"
      >
        <Plus className="w-4 h-4 mr-2" />
        Thêm buổi
      </Button>
    </div>
  );
}
