import type { Metadata } from "next";
import TeyvatMap from "@/components/TeyvatMap";
export const metadata: Metadata = { title: "提瓦特旅行", description: "在地图上，走进七国、挪德卡莱与霜月的风景与旋律。", alternates: { canonical: "/teyvat" } };
export default function TeyvatPage() { return <TeyvatMap />; }
