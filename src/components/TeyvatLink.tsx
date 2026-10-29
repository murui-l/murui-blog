"use client";

import Link from "next/link";
import { useSyncExternalStore, type ComponentProps } from "react";
import { musicActions } from "@/lib/music-player-store";
import { teyvatDestination } from "@/lib/teyvat";
import { teyvatVisits } from "./teyvat-visits";
import { requestTeyvatTravel } from "./TeyvatTravelEffects";

export default function TeyvatLink({ nation, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { nation: string }) {
  const visits = useSyncExternalStore(teyvatVisits.subscribe, teyvatVisits.getSnapshot, teyvatVisits.getServerSnapshot);
  const destination = teyvatDestination(nation);
  const visited = visits.includes(nation);
  const label = props["aria-label"] || (destination ? `前往${destination.name}` : undefined);
  return <Link {...props} data-visited={visited} aria-label={label ? `${label}${visited ? "，已到访" : ""}` : undefined} href={`/teyvat/${nation}`} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === "_blank") return;
    if (destination) {
      requestTeyvatTravel(destination.slug, event.currentTarget, event);
      musicActions.enterTeyvat(destination.slug, destination.tracks, true);
    }
  }} />;
}
