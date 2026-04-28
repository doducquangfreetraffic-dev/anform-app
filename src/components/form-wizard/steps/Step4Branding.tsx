'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { FormBrief, BrandingTheme } from '@/types/form-brief';

const PRESETS: Record<BrandingTheme['preset'], { primary: string; secondary: string; bg: string; label: string }> = {
  angiao: { primary: '#1F4D2C', secondary: '#A47E22', bg: '#F5EFE0', label: 'An Giáo (rừng + mật)' },
  forest: { primary: '#0F3818', secondary: '#5C8D5A', bg: '#F0F4F0', label: 'Rừng xanh' },
  honey:  { primary: '#7C5A12', secondary: '#D4A82C', bg: '#FFF8E7', label: 'Mật vàng' },
  minimal:{ primary: '#1A1A1A', secondary: '#666666', bg: '#FAFAFA', label: 'Tối giản' },
  custom: { primary: '#000000', secondary: '#000000', bg: '#FFFFFF', label: 'Tự chỉnh' },
};

export default function Step4Branding({
  brief,
  update,
}: {
  brief: FormBrief;
  update: (p: Partial<FormBrief>) => void;
}) {
  const [loadingHeadlines, setLoadingHeadlines] = useState(false);
  const [headlines, setHeadlines] = useState<string[]>([]);

  function setPreset(p: BrandingTheme['preset']) {
    const preset = PRESETS[p];
    update({
      branding: {
        ...brief.branding,
        preset: p,
        primary: preset.primary,
        secondary: preset.secondary,
        background: preset.bg,
      },
    });
  }

  async function generateHeadlines() {
    setLoadingHeadlines(true);
    const res = await fetch('/api/forms/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'headlines',
        context: `${brief.title}. ${brief.subtitle ?? ''}. ${brief.description ?? ''}. ${brief.organizerName ?? ''}`,
      }),
    });
    setLoadingHeadlines(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'AI fail');
      return;
    }
    setHeadlines(data.suggestions ?? []);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-forest">Thương hiệu & màu sắc</h2>
        <p className="text-sm text-muted-brand mt-1">
          Chọn preset hoặc tự chỉnh. AI có thể đề xuất tagline & headline.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {(Object.keys(PRESETS) as BrandingTheme['preset'][]).map((p) => {
          const cfg = PRESETS[p];
          const active = brief.branding.preset === p;
          return (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`p-4 rounded-xl border-2 text-left transition ${
                active ? 'border-forest shadow-md' : 'border-soft-line hover:border-honey'
              }`}
              style={{ background: cfg.bg }}
            >
              <div className="flex gap-1 mb-2">
                <span className="w-4 h-4 rounded-full" style={{ background: cfg.primary }} />
                <span className="w-4 h-4 rounded-full" style={{ background: cfg.secondary }} />
              </div>
              <div className="text-xs font-medium" style={{ color: cfg.primary }}>
                {cfg.label}
              </div>
            </button>
          );
        })}
      </div>

      {brief.branding.preset === 'custom' && (
        <div className="grid grid-cols-3 gap-3 p-4 bg-surface rounded-xl border border-soft-line">
          {(['primary', 'secondary', 'background'] as const).map((k) => (
            <div key={k}>
              <Label className="text-xs capitalize">{k}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={brief.branding[k]}
                  onChange={(e) => update({ branding: { ...brief.branding, [k]: e.target.value } })}
                  className="w-12 h-9 p-1"
                />
                <Input
                  value={brief.branding[k]}
                  onChange={(e) => update({ branding: { ...brief.branding, [k]: e.target.value } })}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-soft-line pt-6">
        <div className="flex justify-between items-center mb-3">
          <Label className="text-base font-medium text-forest">Tagline / Headline</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={generateHeadlines}
            disabled={loadingHeadlines || !brief.title.trim()}
            className="border-honey text-honey hover:bg-honey hover:text-white"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {loadingHeadlines ? 'Đang gợi ý…' : 'AI gợi ý'}
          </Button>
        </div>

        <Textarea
          rows={2}
          value={brief.subtitle ?? ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          placeholder="Câu giới thiệu ngắn dưới tiêu đề"
        />

        {headlines.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-muted-brand">Click để chọn:</p>
            {headlines.map((h, i) => (
              <button
                key={i}
                onClick={() => update({ subtitle: h })}
                className="w-full text-left px-3 py-2 text-sm rounded-lg bg-honey/10 hover:bg-honey/20 text-forest transition"
              >
                {h}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
