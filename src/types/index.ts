export type Tag = {
  id: string;
  name: string;
};

export type Prompt = {
  id: string;
  name: string;
  description: string;
  content: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SearchField = "name" | "description" | "content";

export type SearchResult = {
  prompt: Prompt;
  field: SearchField;
  score: number;
};

export type SortMode = "recent" | "alphabetical";

export type Theme = "light" | "dark";

export type ImportSummary = {
  imported: number;
  skipped: number;
  importedTags: number;
};
