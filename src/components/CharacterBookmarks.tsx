import Link from "next/link";
import { characterCollections } from "@/lib/characters";
import "./CharacterBookmarks.css";

export default function CharacterBookmarks() {
  return <nav className="character-bookmarks" aria-label="角色图片专题">
    {characterCollections.map(character => <Link key={character.slug} href={character.href} className={`character-bookmark character-bookmark--${character.tone}`}>
      <span className="character-bookmark__thread" aria-hidden="true" />
      <span>{character.name}</span>
      <span className="character-bookmark__star" aria-hidden="true">✧</span>
    </Link>)}
  </nav>;
}
