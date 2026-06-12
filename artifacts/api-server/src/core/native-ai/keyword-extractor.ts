const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","are","was","were","be","been","being","have","has","had","do",
  "does","did","will","would","could","should","may","might","shall","can",
  "i","you","he","she","it","we","they","me","him","her","us","them","my","your",
  "his","its","our","their","this","that","these","those","what","which","who",
  "how","when","where","why","not","no","yes","up","down","out","if","so","as",
  "at","be","by","go","into","just","like","more","also","then","than","here",
  "there","about","after","before","between","through","during","without",
]);

export function extractKeywords(text: string, maxKeywords = 10): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const freq: Map<string, number> = new Map();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([w]) => w);
}

export function extractNgrams(text: string, n: number): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const ngrams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(" "));
  }
  return ngrams;
}

export function computeTfIdf(document: string, corpus: string[]): Map<string, number> {
  const terms = extractKeywords(document, 50);
  const docWords = document.toLowerCase().split(/\s+/).filter(Boolean);
  const result = new Map<string, number>();

  for (const term of terms) {
    const tf = docWords.filter((w) => w === term).length / (docWords.length || 1);
    const docsWithTerm = corpus.filter((doc) => doc.toLowerCase().includes(term)).length;
    const idf = Math.log((corpus.length + 1) / (docsWithTerm + 1)) + 1;
    result.set(term, tf * idf);
  }

  return result;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) ** 2;
    normB += (b[i] ?? 0) ** 2;
  }
  return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
