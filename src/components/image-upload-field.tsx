'use client';

import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';

type UploadedImages = { image_url: string; thumb_url: string };

export function ImageUploadField({
  userId,
  onUploaded,
}: {
  userId: string;
  onUploaded: (urls: UploadedImages) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const stem = crypto.randomUUID();

      const fullCompressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      const thumbCompressed = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 400,
        useWebWorker: true,
        fileType: 'image/webp',
      });

      const fullPath = `${userId}/${stem}.webp`;
      const thumbPath = `${userId}/${stem}-thumb.webp`;

      const { error: e1 } = await supabase.storage
        .from('artworks')
        .upload(fullPath, fullCompressed, { upsert: false, contentType: 'image/webp' });
      if (e1) throw new Error(`full upload: ${e1.message}`);

      const { error: e2 } = await supabase.storage
        .from('artworks')
        .upload(thumbPath, thumbCompressed, { upsert: false, contentType: 'image/webp' });
      if (e2) throw new Error(`thumb upload: ${e2.message}`);

      const { data: full } = supabase.storage.from('artworks').getPublicUrl(fullPath);
      const { data: thumb } = supabase.storage.from('artworks').getPublicUrl(thumbPath);

      setPreview(thumb.publicUrl);
      onUploaded({ image_url: full.publicUrl, thumb_url: thumb.publicUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="upload preview" className="h-32 w-32 rounded-md object-cover" />
      ) : null}
      <label className="bg-muted/40 hover:bg-muted/60 flex h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed text-sm">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {uploading ? 'Uploading…' : 'Choose image (≤ 8 MB jpg/png/webp)'}
      </label>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
