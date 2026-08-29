import assert from "node:assert/strict";
import test from "node:test";

import {
  CLUSTER_GAP_PADDING_PX,
  clusterMinGap,
  relaxOverlappingClusters,
  type ClusterNode,
} from "./cluster-declutter";

function node(
  x: number,
  y: number,
  count: number,
  radius = 22,
): ClusterNode {
  return { x, y, radius, count, dx: 0, dy: 0 };
}

function placedDistance(a: ClusterNode, b: ClusterNode): number {
  return Math.hypot(b.x + b.dx - (a.x + a.dx), b.y + b.dy - (a.y + a.dy));
}

test("two 44px bubbles 10px apart are pushed to radius+radius+padding", () => {
  const a = node(0, 0, 8);
  const b = node(10, 0, 6);
  relaxOverlappingClusters([a, b]);
  assert.ok(placedDistance(a, b) >= clusterMinGap(a.radius, b.radius) - 0.5);
});

test("Ohio-style 26/85 pair almost stacked still separates", () => {
  const a = node(100, 100, 26);
  const b = node(108, 104, 85);
  relaxOverlappingClusters([a, b]);
  assert.ok(placedDistance(a, b) >= clusterMinGap(22, 22) - 0.5);
});

test("three coincident bubbles do not stay stacked", () => {
  const nodes = [node(0, 0, 8), node(0, 0, 6), node(0, 0, 26)];
  relaxOverlappingClusters(nodes);
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      assert.ok(
        placedDistance(nodes[i], nodes[j]) >=
          clusterMinGap(nodes[i].radius, nodes[j].radius) - 1,
      );
    }
  }
});

test("already-separated bubbles are left alone", () => {
  const a = node(0, 0, 8);
  const b = node(80, 0, 6);
  relaxOverlappingClusters([a, b]);
  assert.equal(a.dx, 0);
  assert.equal(a.dy, 0);
  assert.equal(b.dx, 0);
  assert.equal(b.dy, 0);
});

test("min gap scales with measured radius, not a hardcoded 48px", () => {
  assert.equal(clusterMinGap(22, 22), 44 + CLUSTER_GAP_PADDING_PX);
  assert.equal(clusterMinGap(30, 30), 72);
});
