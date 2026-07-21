import { useEffect, useState } from 'react';
import { api, downloadFile, extractError } from '../api/client';
import UploadForm, { UploadPayload } from '../components/UploadForm';
import { formatBytes, formatTime } from '../utils/format';
import type { FileItem } from '../api/types';

export default function Collective() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await api.get<FileItem[]>('/collective');
      setItems(res.data);
    } catch (err) {
      setError(extractError(err, 'Failed to load files'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onUpload({ file, heading, colour }: UploadPayload) {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('heading', heading);
      form.append('colour', colour);
      const res = await api.post<FileItem>('/collective', form);
      setItems((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(extractError(err, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this file for everyone?')) return;
    try {
      await api.delete(`/collective/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(extractError(err, 'Delete failed'));
    }
  }

  async function onDownload(item: FileItem) {
    try {
      await downloadFile(`/collective/${item.id}/download`, item.fileName);
    } catch (err) {
      setError(extractError(err, 'Download failed'));
    }
  }

  return (
    <div className="space-page">
      <div className="space-header">
        <div>
          <h2>Collective space</h2>
          <p className="muted">Files everyone on the team can see, label, and download.</p>
        </div>
      </div>

      <UploadForm onUpload={onUpload} busy={busy} />

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No files yet. Upload the first one above.</p>
      ) : (
        <div className="file-grid">
          {items.map((item) => (
            <div className="file-card" key={item.id}>
              <div className="file-label" style={{ background: item.label.colour }}>
                {item.label.heading}
              </div>
              <div className="file-body">
                <div className="file-name" title={item.fileName}>
                  {item.fileName}
                </div>
                <div className="file-meta">
                  {formatBytes(item.size)} ·{' '}
                  {typeof item.uploader === 'object' ? item.uploader?.name : ''} ·{' '}
                  {formatTime(item.createdAt)}
                </div>
              </div>
              <div className="file-actions">
                <button className="btn-ghost" onClick={() => onDownload(item)}>
                  Download
                </button>
                <button className="link-danger" onClick={() => onDelete(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
