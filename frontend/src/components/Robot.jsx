import { useId } from 'react'

// state: idle | thinking | speaking | offline — drives the CSS animations.
export default function Robot({ size = 40, state = 'idle', className = '' }) {
  const gradId = `robot-grad-${useId()}`
  const fill = `url(#${gradId})`

  return (
    <svg
      className={`robot robot--${state} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="DocuBot"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <line x1="32" y1="5" x2="32" y2="14" stroke={fill} strokeWidth="3" strokeLinecap="round" />
      <circle className="robot-antenna" cx="32" cy="5" r="3.5" />
      <rect x="4" y="27" width="6" height="12" rx="3" fill={fill} opacity="0.8" />
      <rect x="54" y="27" width="6" height="12" rx="3" fill={fill} opacity="0.8" />
      <rect x="9" y="13" width="46" height="40" rx="14" fill={fill} />
      <rect x="15" y="20" width="34" height="24" rx="9" fill="#08111f" />
      <g className="robot-eyes">
        <ellipse className="robot-eye" cx="25" cy="30" rx="3.6" ry="4.2" />
        <ellipse className="robot-eye" cx="39" cy="30" rx="3.6" ry="4.2" />
      </g>
      <rect className="robot-mouth" x="27" y="37" width="10" height="2.6" rx="1.3" />
    </svg>
  )
}
