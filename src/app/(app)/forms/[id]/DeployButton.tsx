'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import { toast } from 'sonner';

export default function DeployButton({
  formId,
  hasHtml,
  isDeployed,
}: {
  formId: string;
  hasHtml: boolean;
  isDeployed: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function deploy() {
    setLoading(true);
    const res = await fetch('/api/forms/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || 'Deploy fail');
      return;
    }
    toast.success('🌿 Form đã live: ' + data.formUrl);
    router.refresh();
  }

  return (
    <Button
      onClick={deploy}
      disabled={!hasHtml || loading}
      className="w-full bg-forest hover:bg-forest-dark text-white disabled:opacity-50"
    >
      <Rocket className="w-4 h-4 mr-2" />
      {loading
        ? 'Đang deploy (60-120s)…'
        : isDeployed
        ? 'Re-deploy'
        : 'Deploy lên form.anvui.edu.vn'}
    </Button>
  );
}
