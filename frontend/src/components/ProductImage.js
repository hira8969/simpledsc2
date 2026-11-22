import React, { useState } from "react";

const DEFAULT_FALLBACK_IMAGE = "/img/epass2003-token.png";

/**
 * Resolves any image URL with complete backward compatibility.
 * - Handles relative public assets (e.g. /img/epass2003-token.png)
 * - Handles backend media endpoints (/api/media/products/...)
 * - Handles absolute URLs (https://...)
 * - Handles preview blob/data URLs (blob:..., data:image/...)
 */
export function resolveImageUrl(src) {
  if (!src || typeof src !== "string") {
    return DEFAULT_FALLBACK_IMAGE;
  }
  const trimmed = src.trim();
  if (!trimmed) {
    return DEFAULT_FALLBACK_IMAGE;
  }

  // Absolute URLs and in-memory preview URLs
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  // Backend media uploads
  if (trimmed.startsWith("/api/media/") || trimmed.startsWith("api/media/")) {
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const backendUrl = (
      process.env.REACT_APP_BACKEND_URL || "https://simpledsc2.onrender.com"
    ).replace(/\/$/, "");
    return `${backendUrl}${cleanPath}`;
  }

  // Relative public asset (e.g. /img/epass2003-token.png)
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return `/${trimmed}`;
}

/**
 * Universal ProductImage component
 * Strictly implements responsive image-fitting with object-fit: contain
 * Variants:
 *  - "card" | "preview-card" : 5:4 aspect ratio for product listings & cards
 *  - "detail" | "preview-detail" : 1:1 aspect ratio for product detail pages
 *  - "thumbnail" : compact square for cart, orders, modals
 *  - "custom" : custom container
 */
export function ProductImage({
  product,
  src,
  webpSrc,
  alt,
  variant = "card",
  className = "",
  imgClassName = "",
  priority = false,
  aspectRatio,
  onClick,
  dataTestId,
}) {
  // Extract source from product object or direct prop
  const rawSrc = src || product?.imageUrl || DEFAULT_FALLBACK_IMAGE;
  const rawWebpSrc = webpSrc || product?.imageWebpUrl;
  const resolvedSrc = resolveImageUrl(rawSrc);
  const resolvedWebpSrc = rawWebpSrc ? resolveImageUrl(rawWebpSrc) : null;

  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Compute alt text
  const computedAlt =
    alt ||
    (product?.name
      ? `${product.name} - Digital Signature USB Crypto Token`
      : "SimpleDSC USB Crypto Token");

  // Determine frame styling based on variant
  let containerVariantClass = "";
  let defaultAspectRatio = undefined;
  let defaultWidth = 320;
  let defaultHeight = 256;

  if (variant === "card" || variant === "preview-card") {
    containerVariantClass = "is-card product-card-image rounded-2xl";
    defaultAspectRatio = "5 / 4";
    defaultWidth = 320;
    defaultHeight = 256;
  } else if (variant === "detail" || variant === "preview-detail") {
    containerVariantClass = "is-detail product-detail-image rounded-3xl shadow-sm";
    defaultAspectRatio = "1 / 1";
    defaultWidth = 500;
    defaultHeight = 500;
  } else if (variant === "thumbnail") {
    containerVariantClass = "is-thumbnail w-14 h-14 shrink-0 aspect-square rounded-xl bg-purple-50/70 border border-purple-100 p-1";
    defaultAspectRatio = "1 / 1";
    defaultWidth = 64;
    defaultHeight = 64;
  }

  const containerStyle = {
    aspectRatio: aspectRatio || defaultAspectRatio,
    ...(variant === "thumbnail" ? { width: "3.5rem", height: "3.5rem", flexShrink: 0 } : {}),
  };

  const finalSrc = hasError ? DEFAULT_FALLBACK_IMAGE : resolvedSrc;

  return (
    <div
      data-testid={dataTestId || `product-image-${variant}`}
      className={`product-image-container ${containerVariantClass} ${className} relative select-none`}
      style={containerStyle}
      onClick={onClick}
    >
      {/* Loading shimmer placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-100/60 animate-pulse rounded-[inherit] pointer-events-none" />
      )}

      {resolvedWebpSrc && !hasError ? (
        <picture className="w-full h-full flex items-center justify-center">
          <source srcSet={resolvedWebpSrc} type="image/webp" />
          <img
            src={finalSrc}
            alt={computedAlt}
            width={defaultWidth}
            height={defaultHeight}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              setIsLoaded(true);
            }}
            className={`product-image ${
              variant === "card"
                ? "transition-transform duration-500 ease-out group-hover:scale-105"
                : variant === "detail"
                ? "transition-transform duration-500 ease-out hover:scale-103"
                : ""
            } ${
              isLoaded ? "opacity-100" : "opacity-0"
            } transition-opacity duration-300 ${imgClassName}`}
          />
        </picture>
      ) : (
        <img
          src={finalSrc}
          alt={computedAlt}
          width={defaultWidth}
          height={defaultHeight}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          className={`product-image ${
            variant === "card"
              ? "transition-transform duration-500 ease-out group-hover:scale-105"
              : variant === "detail"
              ? "transition-transform duration-500 ease-out hover:scale-103"
              : ""
          } ${
            isLoaded ? "opacity-100" : "opacity-0"
          } transition-opacity duration-300 ${imgClassName}`}
        />
      )}
    </div>
  );
}

export default ProductImage;

