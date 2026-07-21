import { FormEvent, useRef, useState } from 'react';

export const LABEL_COLOURS = [
  '#4f46e5', // indigo
  '#0891b2', // cyan
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#7c3aed', // violet
  '#db2777', // pink
  '#475569', // slate
];

export interface UploadPayload {
  file: File;
  heading: string;
  colour: string;
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
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    await onUpload({ file, heading: heading.trim() || file.name, colour });
    setFile(null);
    setHeading('');
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <form className="card upload-form" onSubmit={onSubmit}>
      <div className="upload-row">
        <input
          ref={fileRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <input
          type="text"
          placeholder="Label / heading"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
        />
      </div>
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
