// client/src/components/shell/Logo.jsx
// ANOVA brand mark: a gold "A" with a leaf swoosh inside a gold ring on deep forest green.
export function LogoMark({ size = 40 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="30" fill="#0C2C26" stroke="#DAAF7C" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#DAAF7C" strokeOpacity=".35" strokeWidth=".8" />
      <path fill="#DAAF7C" fillRule="evenodd" d="M32 13 46.5 49h-5.6l-3.1-7.8H26.2L23.1 49h-5.6zM28.3 36.2h7.4L32 26.4z" />
      <path fill="#EBD9B5" d="M19.5 48.5c3.2-9.5 13.5-10.2 25.5-3.6-8.4 5.8-19.2 7-25.5 3.6z" opacity=".92" />
    </svg>
  );
}

export function Wordmark({ sub = 'MBREMS' }) {
  return (
    <span className="wordmark">
      <span className="wordmark-main">ANOVA</span>
      {sub && <small>{sub}</small>}
    </span>
  );
}
