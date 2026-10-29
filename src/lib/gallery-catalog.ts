import { originalWorks } from "./artwork-collection";
import { personalArtworks } from "./personal-artworks";
import { roxyArtworks } from "./roxy-artworks";
import { mahiruArtworks } from "./mahiru-artworks";
import { meguminArtworks } from "./megumin";
import type { GalleryCategory, GalleryImage } from "./gallery-types";

const categories: GalleryCategory[] = [
  { id: "kokomi", name: "心海" },
  { id: "roxy", name: "洛琪希" },
  { id: "megumin", name: "惠惠" },
  { id: "mahiru", name: "椎名真昼" },
];

type Artwork = { src: string; width: number; height: number; title: string };
const image = (categoryId: string, artwork: Artwork, author = "站主提供", sourceUrl?: string): GalleryImage => ({
  id: `static:${categoryId}:${artwork.src.split("/").pop()!.replace(/\.webp$/, "")}`,
  categoryId,
  src: artwork.src,
  width: artwork.width,
  height: artwork.height,
  alt: artwork.title,
  author,
  ...(sourceUrl ? { sourceUrl } : {}),
});

// Provenance stays in the catalog and licenses. The wall never renders captions.
const candidates = [
  ...personalArtworks.map(artwork => image("kokomi", artwork)),
  ...roxyArtworks.map(artwork => image("roxy", artwork)),
  ...mahiruArtworks.map(artwork => image("mahiru", artwork)),
  ...originalWorks.map(artwork => image(
    { 心海: "kokomi", 洛琪希: "roxy", 惠惠: "megumin" }[artwork.character], artwork, artwork.artist, artwork.url,
  )),
  ...meguminArtworks.map(artwork => image("megumin", artwork, artwork.sourceLabel, artwork.sourceUrl)),
  image("kokomi", { title: "心海插画", src: "/images/artworks/xhs-66f4dc55000000002a030c3e.webp", width: 540, height: 813 }, "Rafa", "https://www.xiaohongshu.com/user/profile/623e91b8000000000201a0f9"),
  image("kokomi", { title: "心海插画", src: "/images/artworks/xhs-657fc3f60000000034037559.webp", width: 540, height: 300 }, "珊瑚宫心海", "https://www.xiaohongshu.com/user/profile/6201e5da000000001000b56f"),
];

const seen = new Set<string>();
export const galleryCatalog = {
  categories,
  images: candidates.filter(artwork => {
    if (seen.has(artwork.src)) return false;
    seen.add(artwork.src);
    return true;
  }),
};
