import { useEffect, useState } from 'react';
import { api, downloadFile, extractError } from '../api/client';
import { useConfirm } from '../context/ConfirmContext';
import UploadForm, { UploadPayload, LABEL_COLOURS } from '../components/UploadForm';
import {
  DownloadIcon,
  ShareIcon,
  TrashIcon,
  MoveToCollectiveIcon,
  CopyIcon,
  RevokeIcon,
  SearchIcon,
} from '../components/Icons';
import { formatBytes, formatDate, formatTime } from '../utils/format';
import { contrastText } from '../utils/color';
import type { FileItem, ShareLinkDto } from '../api/types';

export default function Personal() {
  const confirm = useConfirm();
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [openShares, setOpenShares] = useState<string | null>(null);
  const [shares, setShares] = useState<Record<string, ShareLinkDto[]>>({});
  const [copied, setCopied] = useState<string | null>(null);

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice((n) => (n === message ? '' : n)), 2500);
  }

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

  async function onDelete(item: FileItem) {
    const ok = await confirm({
      title: 'Delete file',
      message: (
        <>
          Delete <strong>{item.fileName}</strong> and all its share links? This cannot be undone.
        </>
      ),
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/personal/${item.id}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
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

  async function onTransferToCollective(item: FileItem) {
    const ok = await confirm({
      title: 'Send to Collective',
      message: (
        <>
          Copy <strong>{item.fileName}</strong> into the shared Collective space? Everyone on the
          team will be able to see and download it. Your personal copy stays private.
        </>
      ),
      confirmText: 'Send to Collective',
    });
    if (!ok) return;
    try {
      await api.post(`/personal/${item.id}/to-collective`, {
        heading: item.label.heading,
        colour: item.label.colour,
      });
      flash(`"${item.fileName}" was sent to the Collective space.`);
    } catch (err) {
      setError(extractError(err, 'Transfer failed'));
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
    const ok = await confirm({
      title: 'Revoke link',
      message: 'Revoke this share link? Anyone using it will immediately lose access.',
      confirmText: 'Revoke',
      danger: true,
    });
    if (!ok) return;
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
    const ok = await confirm({
      title: 'Remove link',
      message: 'Permanently remove this revoked link from the list?',
      confirmText: 'Remove',
      danger: true,
    });
    if (!ok) return;
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

  const q = search.trim().toLowerCase();
  const visible = q
    ? items.filter(
        (i) =>
          i.fileName.toLowerCase().includes(q) ||
          (i.label?.heading || '').toLowerCase().includes(q),
      )
    : items;

  return (
    <div className="space-page">
      <div className="space-header">
        <div>
          <h2>Personal space</h2>
          <p className="muted">
            Your private files. Share with a revocable link, or send a copy to the team.
          </p>
        </div>
      </div>

      <UploadForm onUpload={onUpload} busy={busy} defaultColour={LABEL_COLOURS[1]} />

      {notice && <div className="alert-success">{notice}</div>}
      {error && <div className="alert-error">{error}</div>}

      {!loading && items.length > 0 && (
        <div className="search-bar">
          <span className="search-icon">
            <SearchIcon size={16} />
          </span>
          <input
            className="search-input"
            type="search"
            placeholder="Search your files by name or label…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No personal files yet.</p>
      ) : visible.length === 0 ? (
        <p className="muted">No files match “{search}”.</p>
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
                  {formatBytes(item.size)} · {formatTime(item.createdAt)}
                </div>
              </div>
              <div className="file-actions">
                <button
                  className="icon-btn"
                  onClick={() => onDownload(item)}
                  title="Download"
                  aria-label="Download"
                >
                  <DownloadIcon size={17} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => toggleShares(item.id)}
                  title="Share links"
                  aria-label="Share links"
                >
                  <ShareIcon size={17} />
                </button>
                <button
                  className="btn-ghost btn-icon"
                  onClick={() => onTransferToCollective(item)}
                  title="Send a copy to the Collective space"
                >
                  <MoveToCollectiveIcon size={16} />
                  <span className="btn-icon-label">To Collective</span>
                </button>
                <button
                  className="icon-btn icon-btn-danger"
                  onClick={() => onDelete(item)}
                  title="Delete"
                  aria-label="Delete"
                >
                  <TrashIcon size={17} />
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
                                className="btn-ghost btn-sm btn-icon"
                                onClick={() => copyLink(s.url, s.id)}
                              >
                                <CopyIcon size={14} />
                                <span className="btn-icon-label">
                                  {copied === s.id ? 'Copied!' : 'Copy'}
                                </span>
                              </button>
                            )}
                            {!s.revoked && (
                              <button
                                className="icon-btn icon-btn-danger btn-sm"
                                onClick={() => revokeShare(item.id, s.id)}
                                title="Revoke link"
                                aria-label="Revoke link"
                              >
                                <RevokeIcon size={15} />
                              </button>
                            )}
                            {s.revoked && (
                              <button
                                className="icon-btn icon-btn-danger btn-sm"
                                onClick={() => deleteShare(item.id, s.id)}
                                title="Remove link"
                                aria-label="Remove link"
                              >
                                <TrashIcon size={15} />
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
