export default function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="glow-primary rounded-lg bg-primary flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{ width: size * 0.52, height: size * 0.52 }}
      >
        <path
          d="M5 12.5L9.8 17.5L19 7"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
