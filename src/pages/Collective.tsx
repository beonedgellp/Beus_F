import { useEffect, useState } from 'react';
import { api, downloadFile, extractError } from '../api/client';
import { useConfirm } from '../context/ConfirmContext';
import { usePrompt } from '../context/PromptContext';
import { renameFileName } from '../utils/rename';
import UploadForm, { UploadPayload } from '../components/UploadForm';
import { DownloadIcon, TrashIcon, SearchIcon, EditIcon } from '../components/Icons';
import { formatBytes, formatTime } from '../utils/format';
import { contrastText } from '../utils/color';
import type { FileItem } from '../api/types';

export default function Collective() {
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState<string | null>(null);

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

  async function onDelete(item: FileItem) {
    const ok = await confirm({
      title: 'Delete shared file',
      message: (
        <>
          Delete <strong>{item.fileName}</strong> for the whole team? This cannot be undone.
        </>
      ),
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/collective/${item.id}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
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

  async function onRename(item: FileItem) {
    const result = await renameFileName(prompt, item.fileName);
    if (!result) return;
    try {
      const res = await api.patch<FileItem>(`/collective/${item.id}`, {
        fileName: result.fileName,
        heading: result.heading,
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? res.data : i)));
    } catch (err) {
      setError(extractError(err, 'Rename failed'));
    }
  }

  const q = search.trim().toLowerCase();
  const usedColors = Array.from(new Set(items.map((i) => i.label.colour)));
  const visible = items.filter((i) => {
    if (colorFilter && i.label.colour !== colorFilter) return false;
    if (!q) return true;
    return (
      i.fileName.toLowerCase().includes(q) || (i.label?.heading || '').toLowerCase().includes(q)
    );
  });

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

      {!loading && items.length > 0 && (
        <div className="search-bar">
          <span className="search-icon">
            <SearchIcon size={16} />
          </span>
          <input
            className="search-input"
            type="search"
            placeholder="Search files by name or label…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {!loading && usedColors.length > 1 && (
        <div className="filter-colors">
          <span className="filter-colors-label">Filter by colour:</span>
          <button
            className={`filter-color-all ${!colorFilter ? 'selected' : ''}`}
            onClick={() => setColorFilter(null)}
          >
            All
          </button>
          {usedColors.map((c) => (
            <button
              key={c}
              className={`filter-swatch ${colorFilter === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColorFilter(colorFilter === c ? null : c)}
              aria-label={`filter colour ${c}`}
            />
          ))}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No files yet. Upload the first one above.</p>
      ) : visible.length === 0 ? (
        <p className="muted">No files match your search or colour filter.</p>
      ) : (
        <div className="file-grid">
          {visible.map((item) => (
            <div className="file-card" key={item.id} style={{ borderLeftColor: item.label.colour }}>
              <div className="file-card-head">
                <span
                  className="label-tag"
                  style={{ background: item.label.colour, color: contrastText(item.label.colour) }}
                >
                  {item.label.heading}
                </span>
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
                <button className="btn-ghost btn-icon" onClick={() => onDownload(item)}>
                  <DownloadIcon size={16} />
                  <span className="btn-icon-label">Download</span>
                </button>
                <button
                  className="icon-btn"
                  onClick={() => onRename(item)}
                  title="Rename file"
                  aria-label="Rename file"
                >
                  <EditIcon size={16} />
                </button>
                <button
                  className="icon-btn icon-btn-danger"
                  onClick={() => onDelete(item)}
                  title="Delete file"
                  aria-label="Delete file"
                >
                  <TrashIcon size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
