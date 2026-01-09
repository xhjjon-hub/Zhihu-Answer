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
  ownerId: string; // Link draft to specific account
  questionTitle: string;
  questionUrl?: string;
  content: string; // Markdown content
  status: DraftStatus;
  createdAt: number;
  tags: string[];
}

export interface ZhihuUser {
  id: string;
  name: string;
  avatar: string;
  headline: string;
}

export interface Account {
  user: ZhihuUser;
  expertise: string[];
  interests: string[];
  hasCompletedSetup: boolean;
  lastInteraction: number;
}

export interface AppState {
  accounts: Account[];
  currentAccountId: string | null;
}
