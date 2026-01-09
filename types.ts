export enum DraftStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED'
}

export interface Question {
  id: string;
  title: string;
  url?: string;
  source: 'Search' | 'Simulation';
  reasoning: string; // Why this question was picked
}

export interface Draft {
  id: string;
  questionTitle: string;
  questionUrl?: string;
  content: string; // Markdown content
  status: DraftStatus;
  createdAt: number;
  tags: string[];
}

export interface ZhihuUser {
  name: string;
  avatar: string;
  headline: string;
}

export interface UserConfig {
  expertise: string[];
  interests: string[];
  lastInteraction: number;
  zhihuUser?: ZhihuUser | null; // Added Zhihu user info
}
