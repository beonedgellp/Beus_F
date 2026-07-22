import { ReactNode } from 'react';

/**
 * Turn plain message text into React nodes where any URL becomes a clickable
 * link that opens in a new tab. Handles http(s):// and www. links, and keeps
 * trailing punctuation (e.g. a period after a link) out of the anchor.
 */
export function renderWithLinks(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  if (!text) return nodes;

  const re = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    let url = match[0];

    // Pull trailing punctuation back out of the link.
    let trailing = '';
    const punct = url.match(/[)\].,!?;:'"]+$/);
    if (punct) {
      trailing = punct[0];
      url = url.slice(0, url.length - trailing.length);
    }

    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    const href = url.toLowerCase().startsWith('www.') ? `https://${url}` : url;
    nodes.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="msg-link"
      >
        {url}
      </a>,
    );
    if (trailing) nodes.push(trailing);

    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}
