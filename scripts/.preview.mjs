// temporary: read the drawn rectangles back out of page 1 and print a coarse
// occupancy map, so the layout can be eyeballed without opening a viewer.
import fs from "node:fs";

const text = fs.readFileSync("docs/nextCall-user-activity-map.pdf").toString("latin1");
const first = /<< \/Length (\d+) >>\nstream\n/.exec(text);
const body = text.slice(first.index + first[0].length, first.index + first[0].length + Number(first[1]));

// rounded boxes come out as paths; the page background is the only "re" with w>3000
const re = [...body.matchAll(/(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+) re/g)].map((m) => ({
  x: +m[1], y: +m[2], w: +m[3], h: +m[4],
}));
console.log(`background rects: ${re.length}, largest: ${Math.max(...re.map((r) => r.w))} wide`);

// node boxes = the 114 small white rects; take the path starts instead
const boxes = [];
const pathRe = /([\d.]+) ([\d.]+) m\n([\d.]+) ([\d.]+) l\n/gi;
let m;
while ((m = pathRe.exec(body)) !== null) {
  const x = +m[1], h = +m[2];
  if (h < 150 || h > 1500 || x > 3400) continue; // skip headers/bands
  boxes.push({ x, h });
}
const xs = [...new Set(boxes.map((b) => Math.round(b.x / 10) * 10))].sort((a, b) => a - b);
console.log(`distinct box left edges: ${xs.length} -> ${xs.slice(0, 14).join(", ")}`);
console.log(`box count sampled: ${boxes.length}`);

// coarse map: 120 cols x 34 rows over the page, marking where text lands
const W = 3300, H = 2340;
const grid = Array.from({ length: 34 }, () => Array(120).fill(" "));
let hits = 0;
for (const t of body.matchAll(/1 0 0 1 ([\d.]+) ([\d.]+) Tm/g)) {
  const x = +t[1], ypdf = +t[2];
  const y = 2340 - ypdf;
  const cx = Math.floor((x / W) * 120);
  const cy = Math.floor((y / H) * 34);
  if (cx >= 0 && cx < 120 && cy >= 0 && cy < 34) { grid[cy][cx] = "#"; hits++; }
}
console.log(`text ops mapped: ${hits}`);
console.log(grid.map((r, i) => String(i).padStart(2, " ") + "|" + r.join("")).join("\n"));
