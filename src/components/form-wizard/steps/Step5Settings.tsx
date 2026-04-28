'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FormBrief, FormSettings } from '@/types/form-brief';

export default function Step5Settings({
  brief,
  update,
}: {
  brief: FormBrief;
  update: (p: Partial<FormBrief>) => void;
}) {
  function patchSettings(p: Partial<FormSettings>) {
    update({ settings: { ...brief.settings, ...p } });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-forest">Cài đặt cuối cùng</h2>
        <p className="text-sm text-muted-brand mt-1">
          Quy định cách form xử lý đăng ký và hiển thị trang cảm ơn.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tiêu đề trang &quot;Đã ghi nhận&quot;</Label>
        <Input
          value={brief.settings.successHeadline}
          onChange={(e) => patchSettings({ successHeadline: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Lời cảm ơn</Label>
        <Textarea
          rows={3}
          value={brief.settings.successMessage}
          onChange={(e) => patchSettings({ successMessage: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>URL chuyển hướng sau khi đăng ký (tuỳ chọn)</Label>
        <Input
          type="url"
          value={brief.settings.redirectUrl ?? ''}
          onChange={(e) => patchSettings({ redirectUrl: e.target.value })}
          placeholder="https://… (để trống nếu chỉ hiển thị trang cảm ơn)"
        />
      </div>

      <div className="space-y-3 border-t border-soft-line pt-6">
        <Label className="text-base font-medium text-forest">Thu thập thông tin</Label>

        <div className="flex items-center gap-3">
          <Checkbox
            id="email"
            checked={brief.settings.collectEmail}
            onCheckedChange={(v) => patchSettings({ collectEmail: !!v })}
          />
          <label htmlFor="email" className="text-sm">Thu thập email (khuyến nghị)</label>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="phone"
            checked={brief.settings.collectPhone}
            onCheckedChange={(v) => patchSettings({ collectPhone: !!v })}
          />
          <label htmlFor="phone" className="text-sm">Thu thập số điện thoại</label>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="multi"
            checked={brief.settings.multiSession}
            onCheckedChange={(v) => patchSettings({ multiSession: !!v })}
          />
          <label htmlFor="multi" className="text-sm">Cho phép chọn nhiều buổi</label>
        </div>
      </div>

      <div className="space-y-3 border-t border-soft-line pt-6">
        <div className="flex items-center gap-3">
          <Checkbox
            id="commit"
            checked={brief.settings.requireCommitment}
            onCheckedChange={(v) => patchSettings({ requireCommitment: !!v })}
          />
          <label htmlFor="commit" className="text-sm font-medium">
            Yêu cầu cam kết tham gia
          </label>
        </div>
        {brief.settings.requireCommitment && (
          <Textarea
            rows={2}
            value={brief.settings.commitmentText ?? ''}
            onChange={(e) => patchSettings({ commitmentText: e.target.value })}
            placeholder="Tôi cam kết …"
            className="ml-7"
          />
        )}
      </div>

      <div className="space-y-2 border-t border-soft-line pt-6">
        <Label>Phát hiện đăng ký trùng theo</Label>
        <Select
          value={brief.settings.duplicateCheck}
          onValueChange={(v) => patchSettings({ duplicateCheck: v as FormSettings['duplicateCheck'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email (mặc định)</SelectItem>
            <SelectItem value="phone">Số điện thoại</SelectItem>
            <SelectItem value="none">Không kiểm tra</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
