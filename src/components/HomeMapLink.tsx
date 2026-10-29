"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { homeTeyvatHref } from "@/lib/teyvat";

export default function HomeMapLink({ href, onClick, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} href={href} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || href !== homeTeyvatHref || window.location.pathname !== "/" || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target && props.target !== "_self") return;
    const map = document.getElementById("home-teyvat-map");
    if (!map) return;
    event.preventDefault();
    if (window.location.hash !== "#home-teyvat-map") window.history.pushState(null, "", homeTeyvatHref);
    // Repeated clicks on the current hash must still return from the footer.
    map.scrollIntoView({ behavior: "instant", block: "start" });
  }} />;
}
