'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function GenerateButton({
  formId,
  hasHtml,
}: {
  formId: string;
  hasHtml: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch('/api/forms/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || 'Generate fail');
      return;
    }
    toast.success(`Đã tạo HTML (${(data.bytes / 1024).toFixed(1)}KB) — version ${data.version}`);
    router.refresh();
  }

  return (
    <Button
      onClick={generate}
      disabled={loading}
      className="w-full bg-honey hover:bg-honey-light text-white"
    >
      <Sparkles className="w-4 h-4 mr-2" />
      {loading ? 'AI đang tạo HTML…' : hasHtml ? 'Generate lại với AI' : 'Generate với AI'}
    </Button>
  );
}
