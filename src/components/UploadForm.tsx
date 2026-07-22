import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { formatBytes } from '../utils/format';

export const LABEL_COLOURS = [
  '#3d8bd4', // blue
  '#2f9e97', // teal
  '#4fb07d', // green
  '#d1a13f', // amber
  '#d95f5f', // red
  '#6d78c4', // indigo
  '#9b6fb0', // plum
  '#5a6b80', // slate
];

export interface UploadPayload {
  file: File;
  heading: string;
  colour: string;
}

interface ExtensionMeta {
  groups: Record<string, string[]>;
  all: string[];
  maxUploadBytes: number;
}

export default function UploadForm({
  onUpload,
  busy,
  defaultColour = LABEL_COLOURS[0],
}: {
  onUpload: (payload: UploadPayload) => Promise<void>;
  busy: boolean;
  defaultColour?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [heading, setHeading] = useState('');
  const [colour, setColour] = useState(defaultColour);
  const [meta, setMeta] = useState<ExtensionMeta | null>(null);
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<ExtensionMeta>('/meta/extensions')
      .then((res) => setMeta(res.data))
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    await onUpload({ file, heading: heading.trim() || file.name, colour });
    setFile(null);
    setHeading('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const accept = meta?.all.join(',');
  const categories = meta ? Object.keys(meta.groups) : [];

  return (
    <form className="card upload-form" onSubmit={onSubmit}>
      <div className="upload-row">
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <input
          type="text"
          placeholder="Label / heading"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
        />
      </div>

      {meta && (
        <div className="upload-hint">
          <span>
            Allowed: {categories.join(', ')} · up to {formatBytes(meta.maxUploadBytes)}
          </span>{' '}
          <button
            type="button"
            className="link-plain"
            onClick={() => setShowAll((s) => !s)}
          >
            {showAll ? 'hide' : 'see all extensions'}
          </button>
          {showAll && <div className="upload-ext-list">{meta.all.join('  ')}</div>}
        </div>
      )}

      <div className="upload-row">
        <div className="colour-picker">
          {LABEL_COLOURS.map((c) => (
            <button
              type="button"
              key={c}
              className={`swatch ${colour === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColour(c)}
              aria-label={`colour ${c}`}
            />
          ))}
        </div>
        <button className="btn-primary" type="submit" disabled={busy || !file}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  );
}
