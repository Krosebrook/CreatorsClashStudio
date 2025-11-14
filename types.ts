export type Tone = "professional" | "witty" | "urgent";

export type ImageStyle = "cinematic" | "photographic" | "illustration" | "minimalist" | "digital-art";

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export type GenerationType = 'image' | 'video';

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

export interface PlatformConfig {
  name: string;
  enabled: boolean;
  customInstructions: string;
}

export interface CampaignResult {
  imageUrl?: string;
  videoUrl?: string;
  posts: PlatformPost[];
}

export interface Schedule {
  platform: string;
  dateTime: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
    id: string;
    status: JobStatus;
    result?: CampaignResult;
    error?: string;
}