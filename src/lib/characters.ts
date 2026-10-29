import type { GallerySnapshot } from "./gallery-types";

export type CharacterCollection = {
  slug: string;
  albumId: string;
  name: string;
  href: string;
  tone: "blue" | "rose" | "violet" | "cream";
};

// Album IDs remain stable when a collection is renamed in the gallery.
export const characterCollections: readonly CharacterCollection[] = [
  { slug: "kokomi", albumId: "kokomi", name: "心海", href: "/characters/kokomi", tone: "blue" },
  { slug: "megumin", albumId: "megumin", name: "惠惠", href: "/megumin", tone: "rose" },
  { slug: "roxy", albumId: "roxy", name: "洛琪希", href: "/characters/roxy", tone: "violet" },
  { slug: "mahiru", albumId: "mahiru", name: "椎名真昼", href: "/characters/mahiru", tone: "cream" },
];

export function characterCollection(slug: string) {
  return characterCollections.find(character => character.slug === slug && character.slug !== "megumin");
}

export function characterPhotos(snapshot: GallerySnapshot, albumId: string) {
  const images = snapshot.categories.some(category => category.id === albumId)
    ? snapshot.images.filter(image => image.categoryId === albumId)
    : [];
  return { images, cover: images[0] ?? null, remaining: images.slice(1) };
}
