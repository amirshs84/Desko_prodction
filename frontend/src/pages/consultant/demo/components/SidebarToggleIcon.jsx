/** آیکون سه‌خط + فلش برای باز/بسته کردن سایدبار (RTL) */
export default function SidebarToggleIcon({ collapsed = false, size = 20, color = '#6B7280' }) {
  const s = size;
  const stroke = 1.75;

  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={collapsed ? 'M14 6 L10 12 L14 18' : 'M10 6 L14 12 L10 18'}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="4" y1="7" x2="9" y2="7" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <line x1="4" y1="12" x2="9" y2="12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <line x1="4" y1="17" x2="9" y2="17" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}
