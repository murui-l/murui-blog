import { getImageProps } from "next/image";
import { publicImageSource } from "./public-image";

/** A blurred wallpaper never needs an album's multi-megapixel original.
 * Preload, display and palette sampling must use this same decoded resource. */
export function backdropImageSource(src: string, width: 640 | 1200 = 640): string {
  const source = publicImageSource(src);
  if (!source) return src;
  return getImageProps({ src: source, alt: "", width: width / 2, height: width / 2, quality: 75 }).props.src;
}
