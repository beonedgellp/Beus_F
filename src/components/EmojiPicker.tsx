import { useEffect, useRef } from 'react';
import { EMOJIS } from '../data/emojis';

/**
 * Small emoji popover for the chat composer. Renders above the input; closes
 * on outside click or Escape.
 */
export default function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="emoji-popover" ref={ref} role="dialog" aria-label="Emoji picker">
      <div className="emoji-grid">
        {EMOJIS.map((e, i) => (
          <button
            key={`${e}-${i}`}
            type="button"
            className="emoji-btn"
            onClick={() => onSelect(e)}
            aria-label={`emoji ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
