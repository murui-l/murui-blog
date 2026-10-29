import PhotoWall from "@/components/PhotoWall";
import { getGallerySnapshot } from "@/lib/gallery-store";

export const metadata = { title: "照片墙" };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ album?: string; image?: string }> }) {
  const [snapshot, query] = await Promise.all([getGallerySnapshot(), searchParams]);
  return <main id="main" className="photo-wall-page"><PhotoWall initialData={snapshot} initialCategoryId={query.album || null} initialImageId={query.image || null} /></main>;
}
