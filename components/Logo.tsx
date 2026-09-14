type LogoProps = { size?: number; className?: string };

export function Logo({ size = 24, className = "text-white" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M1 7V1H7 M17 1H23V7 M23 17V23H17 M7 23H1V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
      <rect x="10" y="10" width="4" height="4" fill="currentColor" />
    </svg>
  );
}
