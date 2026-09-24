export const Logo = ({ className = "", dark = false }) => (
  <div className={`flex items-center gap-2.5 ${className}`} data-testid="brand-logo">
    <div className="relative h-9 w-9 shrink-0">
      <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
        <defs>
          <linearGradient id="sdg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8545D4" />
            <stop offset="100%" stopColor="#582294" />
          </linearGradient>
        </defs>
        <path d="M24 2 L42 12 V36 L24 46 L6 36 V12 Z" fill="url(#sdg)" />
        <path d="M30 16 h-9 a4 4 0 0 0 0 8 h6 a4 4 0 0 1 0 8 h-9" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    </div>
    <div className="leading-none">
      <div className="flex items-baseline">
        <span className={`font-display text-xl font-extrabold tracking-tight ${dark ? "text-white" : "text-navy-900"}`}>Simpl</span>
        <span className="font-display text-xl font-extrabold tracking-tight text-purple-600">DSC</span>
        <span className={`ml-0.5 text-[9px] font-semibold ${dark ? "text-lavender-200" : "text-purple-500"}`}>™</span>
      </div>
    </div>
  </div>
);
