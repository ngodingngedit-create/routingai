export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M2 12h5l4-7 4 14 3-7h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-text"
      />
      <circle cx="11" cy="5" r="2.6" className="fill-accent" />
    </svg>
  );
}
