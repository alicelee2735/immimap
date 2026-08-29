/**
 * Screen-space collision for cluster bubbles.
 *
 * leaflet.markercluster recenters each cluster on a weighted centroid, so two
 * groups that were far enough apart when they formed can still land on top of
 * each other after later children shift the centroid. Overlap is resolved by
 * nudging the *rendered* bubbles, not by changing lat/lng.
 */

export const CLUSTER_ICON_SIZE_PX = 44;
/** Extra air between bubble edges so shadows / borders don't visually merge. */
export const CLUSTER_GAP_PADDING_PX = 12;
/** Enough passes for compact packs (NV 8/6, OH 26/85, and 3–4 body chains). */
export const CLUSTER_DECLUTTER_PASSES = 12;

export type ClusterNode = {
  x: number;
  y: number;
  radius: number;
  count: number;
  dx: number;
  dy: number;
};

export function clusterMinGap(radiusA: number, radiusB: number): number {
  return radiusA + radiusB + CLUSTER_GAP_PADDING_PX;
}

function pairDirection(
  a: ClusterNode,
  b: ClusterNode,
  i: number,
  j: number,
): { vx: number; vy: number; distance: number } {
  let vx = b.x + b.dx - (a.x + a.dx);
  let vy = b.y + b.dy - (a.y + a.dy);
  let distance = Math.hypot(vx, vy);

  if (distance < 0.5) {
    // Identical centers: spread on a unique angle per pair so a 3-stack
    // doesn't all push along the same diagonal.
    const angle = ((i * 17 + j * 31) % 360) * (Math.PI / 180);
    vx = Math.cos(angle);
    vy = Math.sin(angle);
    distance = 1;
  }

  return { vx, vy, distance };
}

/**
 * Mutates `dx`/`dy` on each node until pairwise screen gaps are at least
 * (radiusA + radiusB + padding), or `passes` is exhausted.
 */
export function relaxOverlappingClusters(
  nodes: ClusterNode[],
  passes = CLUSTER_DECLUTTER_PASSES,
): void {
  if (nodes.length < 2) return;

  for (let pass = 0; pass < passes; pass += 1) {
    let moved = false;

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const minGap = clusterMinGap(a.radius, b.radius);
        const { vx, vy, distance } = pairDirection(a, b, i, j);
        if (distance >= minGap) continue;

        const overlap = minGap - distance;
        const ux = vx / distance;
        const uy = vy / distance;
        // Split the correction so a tight pack (A–B–C) unravels instead of
        // one small bubble absorbing every collision.
        const half = overlap / 2;
        a.dx -= ux * half;
        a.dy -= uy * half;
        b.dx += ux * half;
        b.dy += uy * half;
        moved = true;
      }
    }

    if (!moved) break;
  }
}
