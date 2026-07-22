import { useEffect, useState } from 'react';
import { fetchBlobUrl } from '../api/client';

/**
 * Loads a token-protected media file as a blob (so the Authorization header is
 * applied) and renders an inline player: a <video> or <audio> element.
 */
export default function AuthMedia({
  path,
  kind,
  className,
}: {
  path: string;
  kind: 'video' | 'audio';
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let active = true;
    fetchBlobUrl(path)
      .then((u) => {
        url = u;
        if (active) setSrc(u);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  if (failed) return <div className="img-failed">media unavailable</div>;
  if (!src) return <div className="img-loading">loading…</div>;

  if (kind === 'audio') {
    return <audio className={className} src={src} controls preload="metadata" />;
  }
  return <video className={className} src={src} controls preload="metadata" playsInline />;
}
