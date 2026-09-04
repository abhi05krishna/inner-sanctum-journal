import type { MoodType } from '../types';

export interface UniverseNode {
  id: string;
  date: string;
  title: string;
  summary?: string;
  mood?: MoodType;
  tags?: string[];
  turnsCount?: number;
  x: number; // 0 to 1 normalized, or scaled coordinate
  y: number;
  rawX: number;
  rawY: number;
  embedding: number[];
}

export interface ConstellationLink {
  sourceId: string;
  targetId: string;
  similarity: number;
}

export interface UniverseProjectionResult {
  status: 'ok' | 'insufficient_data';
  nodes: UniverseNode[];
  links: ConstellationLink[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Computes cosine similarity between two numerical vectors.
 */
export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Fast, deterministic PCA (Principal Component Analysis)
 * Projects high-dimensional embedding vectors (e.g. 768-D or 1536-D) down to 2D coordinates.
 */
export function projectEmbeddingsPCA(
  entries: Array<{
    id: string;
    date: string;
    title: string;
    summary?: string;
    mood?: MoodType;
    tags?: string[];
    turnsCount?: number;
    embedding?: number[];
  }>,
  bounds: { width: number; height: number; padding: number } = { width: 1000, height: 680, padding: 80 }
): UniverseProjectionResult {
  // Filter for valid embeddings
  const validEntries = entries.filter(
    (e) => Array.isArray(e.embedding) && e.embedding.length > 0 && e.embedding.some((val) => val !== 0)
  );

  if (validEntries.length < 2) {
    return {
      status: 'insufficient_data',
      nodes: [],
      links: [],
      minX: 0,
      maxX: bounds.width,
      minY: 0,
      maxY: bounds.height,
    };
  }

  const N = validEntries.length;
  const D = validEntries[0].embedding!.length;

  // 1. Calculate centroid / mean vector
  const mean = new Float64Array(D);
  for (let i = 0; i < N; i++) {
    const emb = validEntries[i].embedding!;
    for (let j = 0; j < D; j++) {
      mean[j] += emb[j];
    }
  }
  for (let j = 0; j < D; j++) {
    mean[j] /= N;
  }

  // 2. Center data
  const centered: Float64Array[] = [];
  for (let i = 0; i < N; i++) {
    const emb = validEntries[i].embedding!;
    const row = new Float64Array(D);
    for (let j = 0; j < D; j++) {
      row[j] = emb[j] - mean[j];
    }
    centered.push(row);
  }

  // Helper: Vector dot product
  function dot(u: Float64Array, v: Float64Array): number {
    let sum = 0;
    for (let i = 0; i < D; i++) sum += u[i] * v[i];
    return sum;
  }

  // Helper: Normalize vector
  function normalize(v: Float64Array): void {
    let norm = 0;
    for (let i = 0; i < D; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm);
    if (norm > 1e-12) {
      for (let i = 0; i < D; i++) v[i] /= norm;
    }
  }

  // 3. Power Iteration for 1st Principal Component (v1)
  const v1 = new Float64Array(D);
  // Deterministic seed: use alternating signs
  for (let i = 0; i < D; i++) {
    v1[i] = i % 2 === 0 ? 0.707 : -0.707;
  }
  normalize(v1);

  for (let iter = 0; iter < 30; iter++) {
    // y = X^T * (X * v1)
    const projections = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      projections[i] = dot(centered[i], v1);
    }
    const nextV1 = new Float64Array(D);
    for (let i = 0; i < N; i++) {
      const p = projections[i];
      const row = centered[i];
      for (let j = 0; j < D; j++) {
        nextV1[j] += p * row[j];
      }
    }
    normalize(nextV1);
    for (let j = 0; j < D; j++) v1[j] = nextV1[j];
  }

  // 4. Deflate data for 2nd Principal Component (v2)
  const deflated: Float64Array[] = [];
  for (let i = 0; i < N; i++) {
    const proj = dot(centered[i], v1);
    const row = new Float64Array(D);
    for (let j = 0; j < D; j++) {
      row[j] = centered[i][j] - proj * v1[j];
    }
    deflated.push(row);
  }

  const v2 = new Float64Array(D);
  for (let i = 0; i < D; i++) {
    v2[i] = (i % 3 === 0 ? 1 : -0.5);
  }
  // Orthogonalize against v1
  const v2v1 = dot(v2, v1);
  for (let j = 0; j < D; j++) v2[j] -= v2v1 * v1[j];
  normalize(v2);

  for (let iter = 0; iter < 30; iter++) {
    const projections = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      projections[i] = dot(deflated[i], v2);
    }
    const nextV2 = new Float64Array(D);
    for (let i = 0; i < N; i++) {
      const p = projections[i];
      const row = deflated[i];
      for (let j = 0; j < D; j++) {
        nextV2[j] += p * row[j];
      }
    }
    // Orthogonalize against v1
    const pV1 = dot(nextV2, v1);
    for (let j = 0; j < D; j++) nextV2[j] -= pV1 * v1[j];
    normalize(nextV2);
    for (let j = 0; j < D; j++) v2[j] = nextV2[j];
  }

  // 5. Project all points onto (v1, v2)
  const rawCoords: Array<{ x: number; y: number; entry: typeof validEntries[0] }> = [];
  let minRawX = Infinity;
  let maxRawX = -Infinity;
  let minRawY = Infinity;
  let maxRawY = -Infinity;

  for (let i = 0; i < N; i++) {
    const rx = dot(centered[i], v1);
    const ry = dot(centered[i], v2);

    if (rx < minRawX) minRawX = rx;
    if (rx > maxRawX) maxRawX = rx;
    if (ry < minRawY) minRawY = ry;
    if (ry > maxRawY) maxRawY = ry;

    rawCoords.push({
      x: rx,
      y: ry,
      entry: validEntries[i],
    });
  }

  // 6. Scale and map to pixel viewport bounds
  const spanX = maxRawX - minRawX || 1e-6;
  const spanY = maxRawY - minRawY || 1e-6;
  const drawWidth = bounds.width - bounds.padding * 2;
  const drawHeight = bounds.height - bounds.padding * 2;

  const nodes: UniverseNode[] = rawCoords.map((item) => {
    // Normalization to 0..1 then map to padded canvas bounds
    const normX = (item.x - minRawX) / spanX;
    const normY = (item.y - minRawY) / spanY;

    // Flip Y so positive variance points upwards
    const px = bounds.padding + normX * drawWidth;
    const py = bounds.height - (bounds.padding + normY * drawHeight);

    return {
      id: item.entry.id,
      date: item.entry.date || item.entry.id,
      title: item.entry.title || 'Untitled Reflection',
      summary: item.entry.summary,
      mood: item.entry.mood,
      tags: item.entry.tags,
      turnsCount: item.entry.turnsCount,
      x: Math.round(px * 10) / 10,
      y: Math.round(py * 10) / 10,
      rawX: item.x,
      rawY: item.y,
      embedding: item.entry.embedding!,
    };
  });

  // 7. Calculate Constellation links between semantically similar entries
  // Links are formed if cosine similarity is >= 0.60 or top mutual neighbors
  const links: ConstellationLink[] = [];
  const addedLinkSet = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    const scoredNeighbors: Array<{ targetId: string; score: number }> = [];

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const sim = computeCosineSimilarity(nodes[i].embedding, nodes[j].embedding);
      if (sim >= 0.55) {
        scoredNeighbors.push({ targetId: nodes[j].id, score: sim });
      }
    }

    // Sort neighbors by similarity descending, take top 2 to avoid web clutter
    scoredNeighbors.sort((a, b) => b.score - a.score);
    const topNeighbors = scoredNeighbors.slice(0, 2);

    for (const neighbor of topNeighbors) {
      const linkKey = [nodes[i].id, neighbor.targetId].sort().join(':::');
      if (!addedLinkSet.has(linkKey)) {
        addedLinkSet.add(linkKey);
        links.push({
          sourceId: nodes[i].id,
          targetId: neighbor.targetId,
          similarity: neighbor.score,
        });
      }
    }
  }

  return {
    status: 'ok',
    nodes,
    links,
    minX: bounds.padding,
    maxX: bounds.width - bounds.padding,
    minY: bounds.padding,
    maxY: bounds.height - bounds.padding,
  };
}
