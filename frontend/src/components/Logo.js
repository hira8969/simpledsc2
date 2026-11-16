import React from "react";

export const Logo = ({
  className = "",
  dark = false,
  size = "md",
  showTagline = true,
}) => {
  const isSm = size === "sm";
  const isLg = size === "lg";

  const iconSizeClass = isSm
    ? "h-7 w-7"
    : isLg
    ? "h-11 w-11 sm:h-12 sm:w-12"
    : "h-8 w-8 sm:h-9 sm:w-9";

  const titleSizeClass = isSm
    ? "text-base sm:text-lg"
    : isLg
    ? "text-2xl sm:text-3xl"
    : "text-lg sm:text-xl";

  const taglineSizeClass = isSm
    ? "text-[6.5px] sm:text-[7px] tracking-[0.14em]"
    : isLg
    ? "text-[9px] sm:text-[10px] tracking-[0.2em]"
    : "text-[7.5px] sm:text-[8px] tracking-[0.16em]";

  const dividerHeightClass = isSm ? "h-6" : isLg ? "h-9" : "h-7";

  return (
    <div
      className={`inline-flex items-center gap-2 sm:gap-2.5 select-none ${className}`}
      data-testid="brand-logo"
    >
      {/* 3D Folded Ribbon Shield Icon */}
      <img
        src="/logo-icon.png"
        alt="SimplDSC"
        width="44"
        height="44"
        className={`${iconSizeClass} object-contain shrink-0 drop-shadow-sm`}
        loading="eager"
      />

      {/* Hairline Elegant Divider */}
      <div
        className={`${dividerHeightClass} w-[1.5px] shrink-0 rounded-full transition-colors ${
          dark ? "bg-white/20" : "bg-slate-300/80"
        }`}
        aria-hidden="true"
      />

      {/* Razor-Sharp Typography & Tagline */}
      <div className="flex flex-col justify-center leading-none text-left">
        <div
          className={`flex items-baseline font-display font-extrabold tracking-tight ${titleSizeClass}`}
        >
          <span
            className={`transition-colors ${
              dark ? "text-white" : "text-slate-900"
            }`}
          >
            Simpl
          </span>
          <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 dark:from-purple-400 dark:via-purple-300 dark:to-indigo-300 bg-clip-text text-transparent font-black">
            DSC
          </span>
          <sup
            className={`text-[8px] sm:text-[9px] font-bold ml-0.5 transition-colors ${
              dark ? "text-purple-300/90" : "text-purple-600"
            }`}
          >
            ™
          </sup>
        </div>

        {showTagline && (
          <span
            className={`mt-0.5 font-sans font-bold uppercase select-none transition-colors ${taglineSizeClass} ${
              dark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            DIGITAL SIGNATURES, MADE SIMPLE.
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
