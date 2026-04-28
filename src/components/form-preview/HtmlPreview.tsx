'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

const VIEWPORTS = [
  { id: 'mobile', label: 'Mobile', width: 380, icon: Smartphone },
  { id: 'tablet', label: 'Tablet', width: 768, icon: Tablet },
  { id: 'desktop', label: 'Desktop', width: 1024, icon: Monitor },
];

export default function HtmlPreview({ html }: { html: string | null }) {
  const [vp, setVp] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  if (!html) {
    return (
      <div className="border-2 border-dashed border-soft-line rounded-xl p-12 text-center bg-surface space-y-3">
        <div className="text-5xl">✨</div>
        <p className="text-muted-brand">Chưa có HTML — nhấn &quot;Generate với AI&quot; để tạo.</p>
      </div>
    );
  }

  const cur = VIEWPORTS.find((v) => v.id === vp)!;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-paper rounded-lg p-1 border border-soft-line">
          {VIEWPORTS.map((v) => {
            const Icon = v.icon;
            return (
              <Button
                key={v.id}
                size="sm"
                variant={v.id === vp ? 'default' : 'ghost'}
                onClick={() => setVp(v.id as typeof vp)}
                className={v.id === vp ? 'bg-forest text-white hover:bg-forest-dark' : 'text-muted-brand'}
              >
                <Icon className="w-3.5 h-3.5 mr-1" />
                {v.label}
              </Button>
            );
          })}
        </div>
        <span className="text-xs text-muted-brand">{(html.length / 1024).toFixed(1)} KB</span>
      </div>

      <div className="bg-paper rounded-xl border border-soft-line p-4 flex justify-center overflow-x-auto">
        <iframe
          srcDoc={html}
          title="Form preview"
          style={{ width: cur.width, height: 800, border: 0, background: 'white', borderRadius: 8 }}
          sandbox="allow-scripts allow-forms"
        />
      </div>
    </div>
  );
}
