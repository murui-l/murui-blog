import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { teyvatDestination, teyvatDestinations } from "@/lib/teyvat";
import TeyvatNationPage from "@/components/TeyvatNationPage";
export function generateStaticParams() { return teyvatDestinations.map(nation => ({ nation: nation.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ nation: string }> }): Promise<Metadata> {
  const nation = teyvatDestination((await params).nation);
  return nation ? { title: `${nation.name} · 提瓦特旅行`, description: `${nation.name}的风景与地区旋律。`, alternates: { canonical: `/teyvat/${nation.slug}` } } : {};
}
export default async function CountryPage({ params }: { params: Promise<{ nation: string }> }) {
  const nation = teyvatDestination((await params).nation); if (!nation) notFound();
  return <TeyvatNationPage key={nation.slug} nation={nation} />;
}
