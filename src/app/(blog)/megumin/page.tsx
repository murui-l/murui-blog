import type { Metadata } from "next";
import MeguminRoom from "@/components/MeguminRoom";
import { getGallerySnapshot } from "@/lib/gallery-store";

export const metadata: Metadata = {
  title: "惠惠の爆裂魔法小屋",
  description: "收藏惠惠的每日一句、爆裂魔法咏唱与可爱瞬间。今天的魔力，也要留给喜欢的事。",
  alternates: { canonical: "/megumin" },
};

export default async function MeguminPage() {
  const gallery = await getGallerySnapshot();
  return <MeguminRoom galleryImages={gallery.images.filter(image => image.categoryId === "megumin")} />;
}
