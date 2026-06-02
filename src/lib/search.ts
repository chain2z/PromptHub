import type { Prompt, SearchField, SearchResult } from "../types";

const FIELD_WEIGHTS: Record<SearchField, number> = {
  name: 1000,
  description: 100,
  content: 10,
};

function fieldScore(value: string, query: string, weight: number): number {
  if (!value) return 0;
  const v = value.toLowerCase();
  const q = query.toLowerCase();
  if (v === q) return weight * 10;
  if (v.startsWith(q)) return weight * 5;
  const idx = v.indexOf(q);
  if (idx < 0) return 0;
  // Tie-break: earlier match scores higher, full-word match boosted.
  const positionBonus = Math.max(0, 50 - idx);
  const boundaryBoost =
    idx === 0 || /\W/.test(v[idx - 1] ?? "") ? weight * 0.5 : 0;
  return weight + positionBonus + boundaryBoost;
}

export function scorePrompt(
  prompt: Prompt,
  query: string
): SearchResult | null {
  if (!query.trim()) return null;
  const q = query.trim();
  const nameScore = fieldScore(prompt.name, q, FIELD_WEIGHTS.name);
  const descScore = fieldScore(prompt.description, q, FIELD_WEIGHTS.description);
  const contentScore = fieldScore(prompt.content, q, FIELD_WEIGHTS.content);
  if (nameScore === 0 && descScore === 0 && contentScore === 0) return null;
  let field: SearchField = "content";
  let score = contentScore;
  if (descScore > 0) {
    field = "description";
    score = descScore;
  }
  if (nameScore > 0) {
    field = "name";
    score = nameScore;
  }
  // Combine secondary signals into score for stable sort, but field is the
  // top-tier match (strict priority Name > Description > Content).
  const combinedScore = nameScore * 10000 + descScore * 100 + contentScore;
  return { prompt, field, score: combinedScore };
}

export function searchPrompts(prompts: Prompt[], query: string): SearchResult[] {
  if (!query.trim()) return [];
  const results: SearchResult[] = [];
  for (const p of prompts) {
    const r = scorePrompt(p, query);
    if (r) results.push(r);
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}
