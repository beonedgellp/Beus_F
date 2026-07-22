interface AvatarProps {
  name?: string;
  avatar?: string;
  color?: string;
  size?: number;
  className?: string;
}

/**
 * Circular avatar. Shows the chosen emoji glyph, or the person's initials as a
 * fallback, on a coloured background.
 */
export default function Avatar({ name, avatar, color, size = 34, className }: AvatarProps) {
  const bg = color || '#3d8bd4';
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <span
      className={`avatar ${className || ''}`}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: avatar ? size * 0.55 : size * 0.4,
        lineHeight: `${size}px`,
      }}
      aria-hidden="true"
    >
      {avatar || initials}
    </span>
  );
}
