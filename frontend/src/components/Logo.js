export const Logo = ({ className = "", dark = false, size = "md" }) => {
  const heightClass = size === "sm" ? "h-7" : size === "lg" ? "h-11" : "h-9";

  if (dark) {
    return (
      <div
        className={`inline-flex items-center bg-white/95 px-2.5 py-1 rounded-xl shadow-sm border border-white/20 transition-all hover:bg-white ${className}`}
        data-testid="brand-logo"
      >
        <img
          src="/logo.png"
          alt="SimplDSC — Digital Signatures, Made Simple"
          className={`${heightClass} w-auto object-contain select-none`}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center ${className}`}
      data-testid="brand-logo"
    >
      <img
        src="/logo.png"
        alt="SimplDSC — Digital Signatures, Made Simple"
        className={`${heightClass} w-auto object-contain select-none`}
      />
    </div>
  );
};

