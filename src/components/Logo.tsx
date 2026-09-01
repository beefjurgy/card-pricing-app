export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#000000" />
      <g transform="translate(16, 17)">
        <path d="M-1.9 4.8 L -3.5 9 L -0.8 7 Z" fill="#16A34A" />
        <path d="M1.9 4.8 L 3.5 9 L 0.8 7 Z" fill="#16A34A" />
        <path d="M-1 5.3 L 0 10 L 1 5.3 Z" fill="#16A34A" />
        <path d="M0 -9 C 3 -6 3.5 -1 3 4 L -3 4 C -3.5 -1 -3 -6 0 -9 Z" fill="#FFFFFF" />
        <circle cx="0" cy="-2" r="1.4" fill="#000000" />
        <path d="M-3 1.6 L -5.3 4.8 L -3 4 Z" fill="#FFFFFF" />
        <path d="M3 1.6 L 5.3 4.8 L 3 4 Z" fill="#FFFFFF" />
      </g>
    </svg>
  );
}
