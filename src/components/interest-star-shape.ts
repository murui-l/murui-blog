// Shared silhouette: rendering, pointer hit area and compound physics use the
// same ten vertices. Coordinates are expressed in a 100 × 100 square.
export const interestStarPoints = Array.from({ length: 10 }, (_, index) => {
  const angle = -Math.PI / 2 + index * Math.PI / 5;
  const radius = index % 2 === 0 ? 46 : 25;
  return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius };
});

const rounded = (value: number) => Number(value.toFixed(3));
export const interestStarClip = `polygon(${interestStarPoints.map(({ x, y }) => `${rounded(x)}% ${rounded(y)}%`).join(",")})`;

export const interestStarPath = interestStarPoints.map((point, index) => {
  const previous = interestStarPoints[(index + 9) % 10];
  const next = interestStarPoints[(index + 1) % 10];
  const before = { x: point.x + (previous.x - point.x) * .11, y: point.y + (previous.y - point.y) * .11 };
  const after = { x: point.x + (next.x - point.x) * .11, y: point.y + (next.y - point.y) * .11 };
  return `${index ? "L" : "M"}${rounded(before.x)} ${rounded(before.y)} Q${rounded(point.x)} ${rounded(point.y)} ${rounded(after.x)} ${rounded(after.y)}`;
}).join(" ") + " Z";
