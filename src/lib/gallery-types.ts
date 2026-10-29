export type GalleryCategory = { id: string; name: string };

export type GalleryImage = {
  id: string;
  categoryId: string;
  src: string;
  width: number;
  height: number;
  alt?: string;
  author?: string;
  sourceUrl?: string;
};

export type GallerySnapshot = {
  categories: GalleryCategory[];
  images: GalleryImage[];
  revision: string;
  trash?: Array<GalleryImage & { deletedAt: string }>;
};
