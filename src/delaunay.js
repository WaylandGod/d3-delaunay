import Cell from "./cell.js";
import Delaunator from "delaunator";
import Voronoi from "./voronoi.js";

export default class Delaunay {
  constructor(points, halfedges, hull, triangles) {
    this.points = points;
    this.halfedges = halfedges;
    this.hull = hull;
    this.triangles = triangles;
  }
  voronoi([xmin, ymin, xmax, ymax] = [0, 0, 960, 500]) {
    const {points, halfedges, hull, triangles} = this;
    const cells = new Array(points.length / 2);
    const circumcenters = new Float64Array(triangles.length / 3 * 2);
    const voronoi = new Voronoi(cells, circumcenters, this, xmin, ymin, xmax, ymax);

    // Compute cell topology.
    for (let i = 0, n = cells.length; i < n; ++i) {
      cells[i] = new Cell(voronoi);
    }
    for (let i = 0, m = halfedges.length; i < m; ++i) {
      cells[triangles[i]]._connect(Math.floor(i / 3), Math.floor(halfedges[i] / 3));
    }
    for (let i = 0, n = cells.length; i < n; ++i) {
      const cell = cells[i];
      cell.triangles = cell.triangles[0];
    }

    // Compute circumcenters.
    for (let i = 0, j = 0, n = triangles.length; i < n; i += 3, j += 2) {
      const x1 = points[triangles[i] * 2];
      const y1 = points[triangles[i] * 2 + 1];
      const x2 = points[triangles[i + 1] * 2];
      const y2 = points[triangles[i + 1] * 2 + 1];
      const x3 = points[triangles[i + 2] * 2];
      const y3 = points[triangles[i + 2] * 2 + 1];
      const a2 = x1 - x2;
      const a3 = x1 - x3;
      const b2 = y1 - y2;
      const b3 = y1 - y3;
      const d1 = x1 * x1 + y1 * y1;
      const d2 = d1 - x2 * x2 - y2 * y2;
      const d3 = d1 - x3 * x3 - y3 * y3;
      const ab = (a3 * b2 - a2 * b3) * 2;
      circumcenters[j] = (b2 * d3 - b3 * d2) / ab;
      circumcenters[j + 1] = (a3 * d2 - a2 * d3) / ab;
    }

    // Compute exterior cell rays.
    {
      let node = hull;
      do {
        const {x: x1, y: y1, t: i, next: {x: x2, y: y2, t: j}} = node;
        const cx = circumcenters[Math.floor(i / 3) * 2];
        const cy = circumcenters[Math.floor(i / 3) * 2 + 1];
        const dx = (x1 + x2) / 2 - cx;
        const dy = (y1 + y2) / 2 - cy;
        const k = (x2 - x1) * (cy - y1) > (y2 - y1) * (cx - x1) ? -1 : 1;
        cells[triangles[i]].vn = cells[triangles[j]].v0 = [k * dx, k * dy];
      } while ((node = node.next) !== hull);
    }

    return voronoi;
  }
  render(context) {
    const {points, halfedges, triangles} = this;
    for (let i = 0, n = halfedges.length; i < n; ++i) {
      const j = halfedges[i];
      if (j < 0 || j < i) continue;
      context.moveTo(points[triangles[i] * 2], points[triangles[i] * 2 + 1]);
      context.lineTo(points[triangles[j] * 2], points[triangles[j] * 2 + 1]);
    }
    this.renderHull(context);
  }
  renderTriangle(i, context) {
    const {points, triangles} = this;
    context.moveTo(points[triangles[i *= 3] * 2], points[triangles[i] * 2 + 1]);
    context.lineTo(points[triangles[i + 1] * 2], points[triangles[i + 1] * 2 + 1]);
    context.lineTo(points[triangles[i + 2] * 2], points[triangles[i + 2] * 2 + 1]);
    context.closePath();
  }
  renderHull(context) {
    const {hull} = this;
    let node = hull;
    do {
      context.moveTo(node.x, node.y);
      context.lineTo(node.next.x, node.next.y);
    } while ((node = node.next) !== hull);
  }
}

Delaunay.from = function(points, fx, fy) {
  const {coords, halfedges, hull, triangles} = new Delaunator(points, fx, fy);
  return new Delaunay(coords, halfedges, hull, triangles);
};
