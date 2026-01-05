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
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  aspectRatio: string;
  style?: 'artistic' | 'ui-flow';
}

export interface UserNote {
  id: string;
  text: string;
  timestamp: number;
}

export interface AIAnalysisSections {
  executiveSummary: string;
  marketResearch: string;
  prd: string;
  uiux: string;
  oneShotPrompt: string;
}

export interface Idea {
  id: string;
  title: string;
  // Deprecated single prompt, kept for legacy migration if needed, but we prefer userNotes now
  initialPrompt: string; 
  userNotes: UserNote[];
  
  // Structured AI output
  analysis: AIAnalysisSections;
  
  status: 'new' | 'processing' | 'ready' | 'error';
  tags: string[];
  createdAt: number;
  updatedAt: number;
  color: string;
  images: GeneratedImage[];
  groundingSources: GroundingChunk[];
  chatHistory: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
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