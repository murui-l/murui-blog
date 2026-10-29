import type { GallerySnapshot } from "./gallery-types";

export type BackgroundScene = { id: string; src: string; position: string };

export const homeBackgroundAlbumName = "首页背景";

export function selectHomeBackgroundScenes(snapshot: GallerySnapshot) {
  const album = snapshot.categories.find(category => typeof category.name === "string" && category.name.normalize("NFKC").trim() === homeBackgroundAlbumName);
  const unique = new Map<string, BackgroundScene>();
  if (album) for (const image of snapshot.images) {
    if (image.categoryId !== album.id || typeof image.id !== "string" || typeof image.src !== "string" || !image.src.trim() || unique.has(image.src)) continue;
    unique.set(image.src, { id: image.id, src: image.src, position: "50% 35%" });
  }
  return { albumId: album?.id ?? null, scenes: [...unique.values()] };
}

// A shuffled bag visits the available images before starting another cycle.
export function takeBackgroundScene(pool: BackgroundScene[], remaining: string[], currentSrc: string, failed: ReadonlySet<string>) {
  const available = pool.filter(scene => scene.src !== currentSrc && !failed.has(scene.src));
  const valid = new Set(available.map(scene => scene.src));
  let bag = remaining.filter(src => valid.has(src));
  if (!bag.length) {
    bag = [...valid];
    for (let index = bag.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [bag[index], bag[other]] = [bag[other], bag[index]];
    }
  }
  const src = bag.pop();
  return { scene: available.find(scene => scene.src === src), remaining: bag };
}
