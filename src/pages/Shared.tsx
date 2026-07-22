import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../api/client';
import { formatBytes } from '../utils/format';
import type { SharedFileInfo } from '../api/types';

type State =
  | { status: 'loading' }
  | { status: 'ready'; info: SharedFileInfo }
  | { status: 'error'; reason: 'notfound' | 'revoked' | 'expired' | 'generic' };

export default function Shared() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    axios
      .get<SharedFileInfo>(`${API_URL}/api/share/${token}`)
      .then((res) => active && setState({ status: 'ready', info: res.data }))
      .catch((err) => {
        const raw = String(err?.response?.data?.error ?? 'generic');
        const reason =
          raw === 'notfound' || raw === 'revoked' || raw === 'expired' ? raw : 'generic';
        if (active) setState({ status: 'error', reason });
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function onDownload() {
    if (state.status !== 'ready') return;
    setDownloading(true);
    try {
      const res = await axios.get(`${API_URL}/api/share/${token}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = state.info.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setState({ status: 'error', reason: 'generic' });
    } finally {
      setDownloading(false);
    }
  }

  const errorMessages: Record<string, string> = {
    notfound: 'This link does not exist.',
    revoked: 'This link has been revoked by its owner.',
    expired: 'This link has expired.',
    generic: 'This file is not available.',
  };

  return (
    <div className="center-screen">
      <div className="card auth-card">
        <h1 className="auth-title">BeUs</h1>
        {state.status === 'loading' && <p className="muted">Loading…</p>}

        {state.status === 'error' && (
          <div className="alert-error">{errorMessages[state.reason]}</div>
        )}

        {state.status === 'ready' && (
          <>
            <p className="auth-sub">
              {state.info.sharedBy ? `${state.info.sharedBy} shared a file with you` : 'Shared file'}
            </p>
            <div className="shared-file">
              <div className="shared-heading">{state.info.heading || state.info.fileName}</div>
              <div className="file-name">{state.info.fileName}</div>
              <div className="file-meta">{formatBytes(state.info.size)}</div>
            </div>
            <button className="btn-primary" onClick={onDownload} disabled={downloading}>
              {downloading ? 'Downloading…' : 'Download'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
