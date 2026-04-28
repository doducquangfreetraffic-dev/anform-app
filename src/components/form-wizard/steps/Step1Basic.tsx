'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { FormBrief } from '@/types/form-brief';

export default function Step1Basic({
  brief,
  update,
}: {
  brief: FormBrief;
  update: (p: Partial<FormBrief>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-forest">Bắt đầu với thông tin cơ bản</h2>
        <p className="text-sm text-muted-brand mt-1">
          Đây là tiêu đề và mô tả người đăng ký sẽ thấy đầu tiên.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Tiêu đề chương trình *</Label>
        <Input
          id="title"
          placeholder="VD: ANVUI Talks 2026"
          value={brief.title}
          onChange={(e) => update({ title: e.target.value })}
          maxLength={200}
          className="text-lg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Tagline (tuỳ chọn)</Label>
        <Input
          id="subtitle"
          placeholder="VD: 3 buổi talkshow đầu năm cho cộng đồng HB Compro"
          value={brief.subtitle ?? ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          maxLength={150}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Mô tả chi tiết (tuỳ chọn)</Label>
        <Textarea
          id="description"
          rows={4}
          placeholder="Chương trình về gì, ai tham gia, mục tiêu…"
          value={brief.description ?? ''}
          onChange={(e) => update({ description: e.target.value })}
          maxLength={1000}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="organizer">Đơn vị tổ chức</Label>
        <Input
          id="organizer"
          placeholder="VD: Lớp học An Vui — HB Compro"
          value={brief.organizerName ?? ''}
          onChange={(e) => update({ organizerName: e.target.value })}
        />
      </div>
    </div>
  );
}
