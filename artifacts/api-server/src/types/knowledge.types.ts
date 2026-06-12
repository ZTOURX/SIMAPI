export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source?: string;
  embedding?: number[];
  keywords: string[];
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  relevanceScore?: number;
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  score: number;
  matchType: "keyword" | "semantic" | "exact";
}

export interface KnowledgeIngestion {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  source?: string;
}

export interface KnowledgeStats {
  total: number;
  byCategory: Record<string, number>;
  totalSize: number;
  lastIngested: number;
}
