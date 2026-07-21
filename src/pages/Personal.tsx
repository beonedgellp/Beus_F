import { useEffect, useState } from 'react';
import { api, downloadFile, extractError } from '../api/client';
import UploadForm, { UploadPayload, LABEL_COLOURS } from '../components/UploadForm';
import { formatBytes, formatDate, formatTime } from '../utils/format';
import type { FileItem, ShareLinkDto } from '../api/types';

export default function Personal() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [openShares, setOpenShares] = useState<string | null>(null);
  const [shares, setShares] = useState<Record<string, ShareLinkDto[]>>({});
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get<FileItem[]>('/personal');
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
      const res = await api.post<FileItem>('/personal', form);
      setItems((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(extractError(err, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this file and all its share links?')) return;
    try {
      await api.delete(`/personal/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(extractError(err, 'Delete failed'));
    }
  }

  async function onDownload(item: FileItem) {
    try {
      await downloadFile(`/personal/${item.id}/download`, item.fileName);
    } catch (err) {
      setError(extractError(err, 'Download failed'));
    }
  }

  async function toggleShares(itemId: string) {
    if (openShares === itemId) {
      setOpenShares(null);
      return;
    }
    setOpenShares(itemId);
    try {
      const res = await api.get<ShareLinkDto[]>(`/personal/${itemId}/shares`);
      setShares((prev) => ({ ...prev, [itemId]: res.data }));
    } catch (err) {
      setError(extractError(err, 'Failed to load share links'));
    }
  }

  async function createShare(itemId: string) {
    try {
      const res = await api.post<ShareLinkDto>(`/personal/${itemId}/shares`, {});
      setShares((prev) => ({ ...prev, [itemId]: [res.data, ...(prev[itemId] || [])] }));
    } catch (err) {
      setError(extractError(err, 'Could not create link'));
    }
  }

  async function revokeShare(itemId: string, shareId: string) {
    try {
      const res = await api.post<ShareLinkDto>(`/personal/shares/${shareId}/revoke`, {});
      setShares((prev) => ({
        ...prev,
        [itemId]: (prev[itemId] || []).map((s) => (s.id === shareId ? res.data : s)),
      }));
    } catch (err) {
      setError(extractError(err, 'Could not revoke link'));
    }
  }

  async function deleteShare(itemId: string, shareId: string) {
    try {
      await api.delete(`/personal/shares/${shareId}`);
      setShares((prev) => ({
        ...prev,
        [itemId]: (prev[itemId] || []).filter((s) => s.id !== shareId),
      }));
    } catch (err) {
      setError(extractError(err, 'Could not delete link'));
    }
  }

  async function copyLink(url: string, shareId: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(shareId);
      setTimeout(() => setCopied((c) => (c === shareId ? null : c)), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  return (
    <div className="space-page">
      <div className="space-header">
        <div>
          <h2>Personal space</h2>
          <p className="muted">
            Your private files. Share any file with a revocable link.
          </p>
        </div>
      </div>

      <UploadForm onUpload={onUpload} busy={busy} defaultColour={LABEL_COLOURS[1]} />

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No personal files yet.</p>
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
                  {formatBytes(item.size)} · {formatTime(item.createdAt)}
                </div>
              </div>
              <div className="file-actions">
                <button className="btn-ghost" onClick={() => onDownload(item)}>
                  Download
                </button>
                <button className="btn-ghost" onClick={() => toggleShares(item.id)}>
                  Share
                </button>
                <button className="link-danger" onClick={() => onDelete(item.id)}>
                  Delete
                </button>
              </div>

              {openShares === item.id && (
                <div className="share-panel">
                  <div className="share-panel-head">
                    <span>Share links</span>
                    <button className="btn-primary btn-sm" onClick={() => createShare(item.id)}>
                      + New link
                    </button>
                  </div>
                  {(shares[item.id] || []).length === 0 ? (
                    <p className="muted small">No links yet.</p>
                  ) : (
                    <ul className="share-list">
                      {(shares[item.id] || []).map((s) => (
                        <li key={s.id} className={`share-item ${s.revoked ? 'revoked' : ''}`}>
                          <div className="share-url" title={s.url}>
                            {s.revoked ? '(revoked) ' : ''}
                            {s.url}
                          </div>
                          <div className="share-sub">
                            {s.downloadCount} downloads
                            {s.expiresAt ? ` · expires ${formatDate(s.expiresAt)}` : ''}
                          </div>
                          <div className="share-actions">
                            {!s.revoked && (
                              <button
                                className="btn-ghost btn-sm"
                                onClick={() => copyLink(s.url, s.id)}
                              >
                                {copied === s.id ? 'Copied!' : 'Copy'}
                              </button>
                            )}
                            {!s.revoked && (
                              <button
                                className="link-danger"
                                onClick={() => revokeShare(item.id, s.id)}
                              >
                                Revoke
                              </button>
                            )}
                            {s.revoked && (
                              <button
                                className="link-danger"
                                onClick={() => deleteShare(item.id, s.id)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
