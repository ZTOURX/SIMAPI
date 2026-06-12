import { extractKeywords, cosineSimilarity } from "./keyword-extractor.js";
export { cosineSimilarity };

const VOCAB_SIZE = 512;
const HASH_SEED = 31;

function hashString(s: string): number {
  let h = HASH_SEED;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function generateEmbedding(text: string, dimensions = VOCAB_SIZE): number[] {
  const keywords = extractKeywords(text, 50);
  const vector = new Array<number>(dimensions).fill(0);

  for (const kw of keywords) {
    const idx = hashString(kw) % dimensions;
    const weight = 1 + kw.length * 0.1;
    vector[idx] = (vector[idx] ?? 0) + weight;
  }

  const bigrams = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (let i = 0; i < bigrams.length - 1; i++) {
    const bigram = `${bigrams[i]}_${bigrams[i + 1]}`;
    const idx = (hashString(bigram) * 7) % dimensions;
    vector[idx] = (vector[idx] ?? 0) + 0.5;
  }

  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    return vector.map((v) => v / norm);
  }
  return vector;
}

export function semanticSimilarity(textA: string, textB: string): number {
  const embA = generateEmbedding(textA);
  const embB = generateEmbedding(textB);
  return cosineSimilarity(embA, embB);
}

export function findMostSimilar<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  topK = 5,
  threshold = 0.1
): Array<{ item: T; score: number }> {
  const queryEmb = generateEmbedding(query);
  return items
    .map((item) => ({
      item,
      score: cosineSimilarity(queryEmb, generateEmbedding(getText(item))),
    }))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
