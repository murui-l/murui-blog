import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CharacterGallery from "@/components/CharacterGallery";
import { characterCollection, characterCollections } from "@/lib/characters";
import { getGallerySnapshot } from "@/lib/gallery-store";

export const revalidate = 300;

export function generateStaticParams() {
  return characterCollections.filter(character => character.slug !== "megumin").map(character => ({ slug: character.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const character = characterCollection((await params).slug);
  if (!character) return {};
  return { title: `${character.name} · 图片收藏`, description: `Murui 收藏的${character.name}图片。`, alternates: { canonical: character.href } };
}

export default async function CharacterPage({ params }: { params: Promise<{ slug: string }> }) {
  const character = characterCollection((await params).slug);
  if (!character) notFound();
  const snapshot = await getGallerySnapshot();
  return <CharacterGallery character={character} initialData={snapshot} />;
}
