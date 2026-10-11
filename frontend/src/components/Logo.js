export const Logo = ({ className = "", dark = false, size = "md" }) => {
  const heightClass = size === "sm" ? "h-7" : size === "lg" ? "h-11" : "h-9";

  return (
    <div
      className={`inline-flex items-center rounded-lg overflow-hidden transition-all ${className}`}
      data-testid="brand-logo"
    >
      <img
        src="/logo1.jpeg"
        alt="SimplDSC — Digital Signatures, Made Simple"
        className={`${heightClass} w-auto object-contain select-none rounded-lg`}
      />
    </div>
  );
};


