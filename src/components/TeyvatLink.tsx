"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { musicActions } from "@/lib/music-player-store";
import { teyvatDestination } from "@/lib/teyvat";

export default function TeyvatLink({ nation, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { nation: string }) {
  return <Link {...props} href={`/teyvat/${nation}`} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === "_blank") return;
    const destination = teyvatDestination(nation);
    if (destination) musicActions.enterTeyvat(destination.slug, destination.tracks, true);
  }} />;
}
