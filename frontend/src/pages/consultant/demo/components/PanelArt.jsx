const AVATAR_COLORS = ['#0F6A49', '#3B82F6', '#7C5CBF', '#E08A2A', '#E25B4A', '#0F766E'];

export function InitialAvatar({ name = '', size = 36, className = '' }) {
  const letter = (name.trim()[0] || 'م');
  const color = AVATAR_COLORS[letter.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-white font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, background: color, fontSize: Math.max(12, size * 0.38) }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
