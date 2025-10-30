export type Tone = "professional" | "witty" | "urgent";

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export interface BrandKit {
  id: string;
  name: string;
  colors: string[];
  voice: string;
  bannedWords: string[];
}

export interface PlatformPost {
  platform: string;
  post: string;
}

export interface CampaignResult {
  imageUrl: string;
  posts: PlatformPost[];
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
    id: string;
    status: JobStatus;
    result?: CampaignResult;
    error?: string;
}
