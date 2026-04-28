'use client';

import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { FormBrief, DatabaseEntry } from '@/types/form-brief';

export default function Step3Database({
  brief,
  update,
}: {
  brief: FormBrief;
  update: (p: Partial<FormBrief>) => void;
}) {
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setParsing(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (result) => {
        setParsing(false);
        if (result.errors.length > 0) {
          toast.error(`CSV lỗi dòng ${result.errors[0].row}: ${result.errors[0].message}`);
          return;
        }
        const rows = result.data
          .map((r): DatabaseEntry | null => {
            const email = r.email || r['email_address'] || '';
            const name = r.name || r['ho_ten'] || r['full_name'] || r.email || '';
            if (!email && !name) return null;
            return {
              email: email.trim().toLowerCase(),
              name: name.trim(),
              klass: r.klass || r['class'] || r['course'] || r['lop'] || undefined,
              phone: r.phone || r['so_dien_thoai'] || r['sdt'] || undefined,
              ...r,
            };
          })
          .filter((r): r is DatabaseEntry => Boolean(r));

        update({ database: rows });
        toast.success(`Đã import ${rows.length} dòng`);
      },
      error: (err) => {
        setParsing(false);
        toast.error('Đọc CSV thất bại: ' + err.message);
      },
    });
  }

  function clear() {
    update({ database: [] });
    if (inputRef.current) inputRef.current.value = '';
  }

  const sampleColumns = brief.database[0] ? Object.keys(brief.database[0]).slice(0, 6) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-forest">Danh sách học viên (tuỳ chọn)</h2>
        <p className="text-sm text-muted-brand mt-1">
          Upload CSV danh sách học viên có sẵn. Form sẽ auto-fill khi học viên nhập email/tên.
          Có thể bỏ qua nếu form mở cho mọi người đăng ký.
        </p>
      </div>

      {brief.database.length === 0 ? (
        <div className="border-2 border-dashed border-honey/40 rounded-xl p-12 text-center bg-surface space-y-4">
          <Upload className="w-12 h-12 text-honey mx-auto" />
          <div>
            <p className="font-medium text-forest">Kéo thả CSV vào đây hoặc</p>
            <Label htmlFor="csv-upload" className="cursor-pointer text-honey hover:underline">
              chọn file từ máy
            </Label>
            <input
              id="csv-upload"
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              disabled={parsing}
            />
          </div>
          <p className="text-xs text-muted-brand">
            Cột bắt buộc: <code className="bg-paper px-1 rounded">email</code>,{' '}
            <code className="bg-paper px-1 rounded">name</code>. Khác: klass, phone, …
          </p>
        </div>
      ) : (
        <div className="border border-soft-line rounded-xl p-6 bg-surface space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-honey" />
              <div>
                <p className="font-medium text-forest">{brief.database.length} dòng đã import</p>
                <p className="text-xs text-muted-brand">
                  Cột: {sampleColumns.join(', ')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clear}>
              <X className="w-4 h-4 mr-1" />
              Xoá
            </Button>
          </div>

          <div className="bg-white rounded-lg border border-soft-line max-h-64 overflow-auto">
            <table className="text-xs w-full">
              <thead className="bg-paper border-b border-soft-line sticky top-0">
                <tr>
                  {sampleColumns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-medium text-muted-brand">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brief.database.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-soft-line/50 last:border-0">
                    {sampleColumns.map((col) => (
                      <td key={col} className="px-3 py-1.5 text-ink">
                        {String(r[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {brief.database.length > 50 && (
              <div className="text-center text-xs text-muted-brand py-2">
                … và {brief.database.length - 50} dòng nữa
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
