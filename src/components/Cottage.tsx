export default function Cottage({ small = false }: { small?: boolean }) {
  return <svg className={small ? "cottage small" : "cottage"} viewBox="0 0 580 410" role="img" aria-label="阳光下的小屋、树木和打开的书本插画">
    <defs><pattern id="paper-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#93a382" opacity=".3" /></pattern></defs>
    <ellipse cx="295" cy="347" rx="218" ry="30" fill="#e5e7db" />
    <circle cx="398" cy="90" r="46" fill="#edc994" /><path d="m399 25 2-12m56 53 15-3m-39 83 9 11m-93-80-14-5" stroke="#dbb782" strokeWidth="2" strokeLinecap="round" />
    <path d="M67 313c45-92 97-97 154-68s82 13 128-21 111-4 164 90" fill="#e8ecdf" />
    <path d="M54 90h13m-6-6v12M483 168h11m-5-5v11" stroke="#9fa78f" strokeWidth="1.6" />
    <path d="M101 120c15-18 44-15 56 0m-28-6c9-18 40-21 53 0" fill="none" stroke="#d4dbcc" strokeWidth="2" strokeLinecap="round" />
    <path d="M118 293q91-24 175 19 77-43 165-19v29q-86-9-165 33-77-41-175-34Z" fill="#e4d3b3" stroke="#777f66" strokeWidth="2" strokeLinejoin="round" />
    <path d="M122 282q78-15 171 25 83-39 161-25v29q-77-10-161 33-86-43-171-34Z" fill="#fffdf5" stroke="#777f66" strokeWidth="2" strokeLinejoin="round" />
    <path d="M137 287q66-9 146 27m18 0q69-30 136-27M137 296q66-9 146 27m18 0q69-30 136-27M293 307v36" stroke="#d4c6ad" strokeWidth="1.3" fill="none" />
    <path d="M235 274h116V166l-57-39-59 42Z" fill="#f4ecd9" stroke="#68745f" strokeWidth="2" />
    <path d="m214 169 79-68 84 68-15 12-68-56-66 56Z" fill="#647d66" stroke="#536e57" strokeWidth="2" strokeLinejoin="round" />
    <path d="M330 130V97h16v45" fill="#deceb0" stroke="#68745f" strokeWidth="2" />
    <path d="M337 83c-13-16 12-20 0-39" stroke="#bbc3ac" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M278 275v-57q0-17 16-17t16 17v57" fill="#91a186" stroke="#68745f" strokeWidth="2" />
    <circle cx="303" cy="239" r="2" fill="#f7edcf" />
    <path d="M247 182h20v29h-20Zm76 0h17v29h-17Z" fill="#d7dfce" stroke="#68745f" strokeWidth="2" />
    <path d="M257 183v27m-9-14h17m66-13v27m-7-14h15" stroke="#83917a" />
    <path d="M229 277h132l9 9H221Z" fill="#e1d8c0" stroke="#87907a" strokeWidth="1.5" />
    <path d="M179 273V143" stroke="#75806a" strokeWidth="4" strokeLinecap="round" />
    <path d="M181 115c-46 17-59 51-25 65-33 17-16 59 26 52 41 5 51-34 24-51 33-18 13-51-25-66Z" fill="#a7b89a" />
    <path d="M180 157v109m0-49-17-13m17-19 18-14" fill="none" stroke="#718666" strokeWidth="2" strokeLinecap="round" />
    <path d="M398 279v-76" stroke="#7a866b" strokeWidth="3" />
    <path d="M398 186c-34 12-42 38-21 50-18 12-10 36 21 33 33 0 38-25 20-36 20-10 12-33-20-47Z" fill="#829e7c" />
    <path d="M398 213v57m0-24 13-10m-13 21-12-9" stroke="#58745a" fill="none" strokeWidth="1.5" />
    <path d="M111 269q-6-16-16-16 0 14 16 16m-1 10q5-22 18-20-4 18-18 20" fill="#8da280" />
    <path d="M449 265q-7-18-16-18 0 13 16 18m1 11q4-18 14-18-1 14-14 18" fill="#a7b89a" />
    <path d="M358 59q5-7 12-4m-10 5q5-7 12-4M86 184q5-7 12-4m-10 5q5-7 12-4" fill="none" stroke="#8e9981" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="447" cy="330" r="4" fill="#c8a87d" /><circle cx="93" cy="322" r="3" fill="#bac5a7" />
  </svg>;
}
