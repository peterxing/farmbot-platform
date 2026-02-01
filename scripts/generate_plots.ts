import fs from 'node:fs';
import path from 'node:path';

type Point = [number, number];

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  // Ray casting algorithm
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function main() {
  const rows = Number(process.env.PLOT_ROWS ?? 9);
  const cols = Number(process.env.PLOT_COLS ?? 27);
  const totalAreaSqm = Number(process.env.FARM_TOTAL_AREA_SQM ?? 242800);

  const root = path.resolve(__dirname, '..');
  const boundaryPath = path.join(root, 'apps', 'api', 'data', 'property_boundary_image.json');
  const outPath = path.join(root, 'apps', 'api', 'data', 'plots.json');

  const boundary = JSON.parse(fs.readFileSync(boundaryPath, 'utf8')) as Point[];

  const plots: any[] = [];
  let idx = 1;

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const x0 = (c - 1) / cols;
      const x1 = c / cols;
      const y0 = (r - 1) / rows;
      const y1 = r / rows;

      const centroid: Point = [(x0 + x1) / 2, (y0 + y1) / 2];
      const enabled = pointInPolygon(centroid, boundary);

      plots.push({
        id: `plot_${String(idx).padStart(3, '0')}`,
        name: `Grid r${String(r).padStart(2, '0')}c${String(c).padStart(2, '0')}`,
        enabled,
        areaSqm: 0, // assigned after we know enabled count
        polygonImage: [
          [x0, y0],
          [x1, y0],
          [x1, y1],
          [x0, y1]
        ]
      });

      idx++;
    }
  }

  const enabledPlots = plots.filter((p) => p.enabled);
  const enabledCount = enabledPlots.length;
  if (enabledCount <= 0) throw new Error('No enabled plots. Boundary polygon likely wrong.');

  const baseArea = Math.floor(totalAreaSqm / enabledCount);
  const remainder = totalAreaSqm - baseArea * enabledCount;

  enabledPlots.forEach((p, i) => {
    p.areaSqm = baseArea + (i < remainder ? 1 : 0);
  });

  fs.writeFileSync(outPath, JSON.stringify(plots, null, 2), 'utf8');
  console.log(`Wrote ${plots.length} plots (${rows}x${cols}) to ${outPath}`);
  console.log(`Enabled: ${enabledCount}; baseArea=${baseArea}; remainder=${remainder}`);
}

main();
