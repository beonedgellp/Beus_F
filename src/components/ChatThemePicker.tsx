import { useEffect, useRef } from 'react';

const BG_PRESETS = ['#0b1428', '#0f1d2e', '#101a10', '#1a1226', '#0c0c14', '#241016'];
const BUBBLE_PRESETS = ['#00a4ff', '#2f9e97', '#6d4bb0', '#2e8b57', '#ff5a5f', '#d1a13f'];

/**
 * Popover to personalise the chat: pick a background colour for the chat area
 * and a colour for your own message bubbles. "Default" clears the choice.
 */
export default function ChatThemePicker({
  bg,
  bubble,
  onChangeBg,
  onChangeBubble,
  onReset,
  onClose,
}: {
  bg: string;
  bubble: string;
  onChangeBg: (c: string) => void;
  onChangeBubble: (c: string) => void;
  onReset: () => void;
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
    <div className="theme-popover" ref={ref} role="dialog" aria-label="Chat colours">
      <div className="theme-section">
        <div className="theme-title">Chat background</div>
        <div className="theme-row">
          <button
            type="button"
            className={`theme-default ${bg === '' ? 'selected' : ''}`}
            onClick={() => onChangeBg('')}
          >
            Default
          </button>
          {BG_PRESETS.map((c) => (
            <button
              type="button"
              key={c}
              className={`theme-swatch ${bg === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => onChangeBg(c)}
              aria-label={`background ${c}`}
            />
          ))}
          <label className="theme-color" title="Custom colour">
            <input
              type="color"
              value={bg || '#0b1428'}
              onChange={(e) => onChangeBg(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="theme-section">
        <div className="theme-title">My message colour</div>
        <div className="theme-row">
          <button
            type="button"
            className={`theme-default ${bubble === '' ? 'selected' : ''}`}
            onClick={() => onChangeBubble('')}
          >
            Default
          </button>
          {BUBBLE_PRESETS.map((c) => (
            <button
              type="button"
              key={c}
              className={`theme-swatch ${bubble === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => onChangeBubble(c)}
              aria-label={`bubble ${c}`}
            />
          ))}
          <label className="theme-color" title="Custom colour">
            <input
              type="color"
              value={bubble || '#2a3a60'}
              onChange={(e) => onChangeBubble(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="theme-foot">
        <button type="button" className="btn-ghost btn-sm" onClick={onReset}>
          Reset to default
        </button>
      </div>
    </div>
  );
}
