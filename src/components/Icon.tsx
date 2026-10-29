import type { CSSProperties } from "react";
const paths = {
  arrow: "M5 12h14m-6-6 6 6-6 6", upRight: "M7 17 17 7M7 7h10v10",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  pen: "m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z",
  home: "m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7",
  book: "M12 6v15M3 3h4a5 5 0 0 1 5 3 5 5 0 0 1 5-3h4v16h-4a5 5 0 0 0-5 2 5 5 0 0 0-5-2H3V3Z",
  plus: "M12 5v14M5 12h14", close: "m6 6 12 12M6 18 18 6",
  image: "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm-1 14 5-5 4 4 3-3 6 6M8 8h.01",
  settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
  logout: "M9 3H4v18h5M10 12h11m-4-4 4 4-4 4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  check: "m5 12 4 4L19 6", mail: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5", leaf: "M4 20 16 8M5 17C-1 5 14 3 21 3c0 13-6 18-16 14Z",
  folder: "M3 5h6l2 3h10v12H3V5Z", chevron: "m9 5 7 7-7 7",
};
export default function Icon({ name, size = 20, className, style }: { name: keyof typeof paths; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}><path d={paths[name]} /></svg>;
}
