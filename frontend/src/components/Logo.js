export const Logo = ({ className = "", dark = false, size = "md" }) => {
  const heightClass = size === "sm" ? "h-7" : size === "lg" ? "h-11" : "h-9";

  return (
    <div
      className={`inline-flex items-center ${className}`}
      data-testid="brand-logo"
    >
      <img
        src={dark ? "/logo-dark.png" : "/logo.png"}
        alt="SimplDSC — Digital Signatures, Made Simple"
        className={`${heightClass} w-auto object-contain select-none`}
      />
    </div>
  );
};



