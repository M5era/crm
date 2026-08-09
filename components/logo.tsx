export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Interlinked CRM"
    >
      <defs>
        <linearGradient id="inflate-mark" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#8b7bff" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#inflate-mark)" />
      {/* An upward step chart: growth, which is what every workspace tracks. */}
      <path
        d="M11 26.5 L17 20.5 L22 24 L29.5 14.5"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29.5" cy="14.5" r="2.9" fill="white" />
    </svg>
  );
}
