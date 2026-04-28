'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function ExportButton({
  formId,
  formSlug,
}: {
  formId: string;
  formSlug: string;
}) {
  const [loading, setLoading] = useState(false);

  async function exportCsv() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('form_id', formId)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Lỗi: ' + error.message);
      setLoading(false);
      return;
    }
    const rows = ((data ?? []) as Array<{ data: Record<string, unknown>; created_at: string; ip_address: string | null }>).map((s) => ({
      timestamp: s.created_at,
      ip: s.ip_address ?? '',
      ...s.data,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
    toast.success(`Đã export ${rows.length} dòng`);
  }

  return (
    <Button onClick={exportCsv} disabled={loading} variant="outline" className="border-forest text-forest">
      <Download className="w-4 h-4 mr-2" />
      {loading ? 'Đang xuất…' : 'Xuất CSV'}
    </Button>
  );
}
