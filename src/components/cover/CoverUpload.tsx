'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  initialUrl?: string | null;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export default function CoverUpload({ initialUrl, onUploaded, onRemoved }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setError(null);

      if (!ACCEPTED.includes(file.type)) {
        setError('Chỉ hỗ trợ JPG, PNG, WebP');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(`Ảnh quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB) — tối đa 5 MB`);
        return;
      }

      setUploading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Phải đăng nhập trước');

        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('form-covers')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from('form-covers').getPublicUrl(path);
        setPreviewUrl(pub.publicUrl);
        onUploaded(pub.publicUrl);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    maxFiles: 1,
    disabled: uploading,
  });

  function handleRemove() {
    setPreviewUrl(null);
    setError(null);
    onRemoved();
  }

  if (previewUrl) {
    return (
      <div className="space-y-2">
        <div className="relative group">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-honey/40">
            <Image
              src={previewUrl}
              alt="Cover preview"
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Xoá ảnh bìa"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/95 shadow-md hover:bg-red-50"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
        <p className="text-xs text-muted-brand">
          ✓ Đã upload. Khi nhấn <strong>Generate</strong>, AI sẽ phân tích ảnh và thiết kế form đồng bộ
          với màu sắc + phong cách.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          isDragActive ? 'border-honey bg-paper' : 'border-soft-line hover:border-honey/60'
        } ${uploading ? 'opacity-60 cursor-wait' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="space-y-2">
            <div className="text-honey font-medium text-sm">Đang upload…</div>
            <div className="h-1.5 bg-paper rounded-full overflow-hidden">
              <div className="h-full bg-honey animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        ) : (
          <>
            <ImageIcon className="mx-auto w-10 h-10 text-honey mb-2" />
            <p className="text-sm font-medium text-forest">
              {isDragActive ? 'Thả ảnh ở đây' : 'Kéo thả hoặc click để chọn ảnh'}
            </p>
            <p className="text-xs text-muted-brand mt-1">
              JPG / PNG / WebP · ≤ 5 MB · khuyên dùng 1920×1080 (16:9)
            </p>
          </>
        )}
      </div>
      {error && (
        <div className="text-sm text-red-600 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
