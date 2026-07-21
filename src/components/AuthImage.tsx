import { useEffect, useState } from 'react';
import { fetchBlobUrl } from '../api/client';

/**
 * Loads an image from a token-protected backend endpoint by fetching it as a
 * blob (so the Authorization header is applied) and rendering an object URL.
 */
export default function AuthImage({
  path,
  alt,
  className,
  onClick,
}: {
  path: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
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

  if (failed) return <div className="img-failed">image unavailable</div>;
  if (!src) return <div className="img-loading">loading…</div>;
  return <img src={src} alt={alt} className={className} onClick={onClick} />;
}
