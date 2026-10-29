"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { musicActions } from "@/lib/music-player-store";
import { isTeyvatPath, destinationFromPath } from "@/lib/teyvat";

export default function TeyvatAudioBridge() {
  const pathname = usePathname();
  useEffect(() => {
    // The map is embedded on the home page; its hash never extends a music session.
    if (!isTeyvatPath(pathname)) { musicActions.leaveTeyvat(); return; }
    const nation = destinationFromPath(pathname);
    if (nation) musicActions.syncTeyvat(nation.slug, nation.tracks);
  }, [pathname]);
  return null;
}
