export interface User {
  id: number;
  name: string;
  email: string;
  job_role?: string;
  referral_source?: string;
  created_at: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        content: string;
      }[];
    }[];
  };
  source_type?: string;
  uri?: string;
  title?: string;
}

export interface GeneratedImage {
  id: number;
  idea_id?: number;
  storage_key: string;
  url: string;
  prompt: string;
  aspect_ratio: string;
  style?: 'artistic' | 'ui-flow';
}

export interface UserNote {
  id: number;
  idea_id: number;
  text: string;
  created_at: string;
  timestamp?: number;
}

export interface AIAnalysisSections {
  executive_summary: string;
  market_research: string;
  prd: string;
  uiux: string;
  one_shot_prompt: string;
}

export interface Idea {
  id: number;
  user_id: number;
  title: string;
  initial_prompt: string;
  status: 'new' | 'processing' | 'ready' | 'error';
  tags: string[];
  color: string;
  created_at: string;
  updated_at: string;
  notes: UserNote[];
  analysis: AIAnalysisSections;
  images: GeneratedImage[];
  grounding_sources: GroundingChunk[];
  chat_messages: ChatMessage[];
  userNotes?: UserNote[];
  groundingSources?: GroundingChunk[];
  chatHistory?: ChatMessage[];
}

export interface ChatMessage {
  id: number;
  idea_id?: number;
  role: 'user' | 'model';
  text: string;
  is_thinking?: boolean;
  created_at?: string;
}

export enum AspectRatio {
  SQUARE = "1:1",
  PORTRAIT = "3:4",
  LANDSCAPE = "4:3",
  WIDE = "16:9",
  ULTRAWIDE = "21:9",
  NINE_SIXTEEN = "9:16"
}

export enum ImageSize {
  ONE_K = "1K",
  TWO_K = "2K",
  FOUR_K = "4K"
}
