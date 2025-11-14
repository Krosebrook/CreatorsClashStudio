import { GoogleGenAI } from "@google/genai";
import type { Tone, AspectRatio, PlatformPost, Job, CampaignResult, BrandKit, ImageStyle, GenerationType, PlatformConfig } from "../types";
import { BRAND_KITS } from "../data/brandKits";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

// In-memory stores to simulate a database/cache for this example
const jobStore = new Map<string, Job>();
const imageCache = new Map<string, string>();


const PLATFORMS = [
  { 
    name: "LinkedIn", 
    promptRule: "professional post for a business audience, around 1500 characters. Include 3-5 relevant hashtags." 
  },
  { 
    name: "Twitter", 
    promptRule: "concise and punchy tweet, under 280 characters. Use 1-2 relevant hashtags." 
  },
  { 
    name: "Instagram", 
    promptRule: "engaging and visually-focused caption, around 150 characters. Include 10-15 relevant hashtags."
  },
];

function applyBrandLinting(text: string, brandKit: BrandKit): string {
    if (!brandKit.bannedWords || brandKit.bannedWords.length === 0) {
        return text;
    }
    let lintedText = text;
    brandKit.bannedWords.forEach(word => {
        // Creates a case-insensitive, whole-word regular expression
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        lintedText = lintedText.replace(regex, '****');
    });
    return lintedText;
}

async function generateImage(prompt: string, aspectRatio: AspectRatio, imageStyle: ImageStyle, brandKit?: BrandKit): Promise<string> {
  const cacheKey = JSON.stringify({ prompt, aspectRatio, imageStyle, brandKitId: brandKit?.id || 'none' });
  if (imageCache.has(cacheKey)) {
    console.log("Image cache hit!");
    return imageCache.get(cacheKey)!;
  }
  console.log("Image cache miss. Generating new image...");
  
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  let finalPrompt = `A high-quality, ${imageStyle} style image representing the concept: "${prompt}". Clean, professional, with negative space. No text on the image.`;
  if (brandKit && brandKit.colors.length > 0) {
      finalPrompt += ` The color palette should be inspired by: ${brandKit.colors.join(', ')}.`;
  }

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: finalPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
      imageCache.set(cacheKey, imageUrl); // Store in cache
      return imageUrl;
    }
    throw new Error("Image generation failed to return an image.");
  } catch (error) {
    console.error("Error generating image:", error);
    let userFriendlyMessage = "Failed to generate the campaign image due to an unexpected issue. The service may be temporarily unavailable.";

    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('api key')) {
             userFriendlyMessage = "Image generation failed due to a server configuration issue. Please try again later.";
        } else if (errorMessage.includes('safety') || errorMessage.includes('policy')) {
            userFriendlyMessage = "The campaign image could not be generated because the prompt may violate content safety policies. Please try rephrasing your campaign idea.";
        } else if (error.message === "Image generation failed to return an image.") {
            userFriendlyMessage = "The AI failed to generate an image for this idea. Please try a different or more descriptive idea.";
        }
    }
    
    throw new Error(userFriendlyMessage);
  }
}

async function generateVideo(prompt: string, aspectRatio: AspectRatio, brandKit?: BrandKit): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    let finalPrompt = `A short, high-quality video representing the concept: "${prompt}". Clean, professional.`;
    if (brandKit && brandKit.colors.length > 0) {
        finalPrompt += ` The color palette should be inspired by: ${brandKit.colors.join(', ')}.`;
    }

    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: finalPrompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (operation.response?.generatedVideos?.[0]?.video?.uri) {
            const downloadLink = operation.response.generatedVideos[0].video.uri;
            const response = await fetch(`${downloadLink}&key=${API_KEY}`);
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`);
            }
            const videoBlob = await response.blob();
            return URL.createObjectURL(videoBlob);
        }
        
        throw new Error("Video generation operation completed but returned no video URI.");
    } catch (error) {
        console.error("Error generating video:", error);
        let userFriendlyMessage = "Failed to generate the campaign video. The service may be temporarily unavailable.";
        
        if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('api key') || errorMessage.includes('requested entity was not found')) {
                userFriendlyMessage = "Video generation failed. Please check if you have selected a valid API key with billing enabled.";
            } else if (errorMessage.includes('safety') || errorMessage.includes('policy')) {
                userFriendlyMessage = "The campaign video could not be generated because the prompt may violate content safety policies. Please try rephrasing your campaign idea.";
            } else if (error.message.includes("returned no video URI")) {
                userFriendlyMessage = "The AI failed to generate a video for this idea. Please try a different or more descriptive idea.";
            }
        }
        
        throw new Error(userFriendlyMessage);
    }
}


async function generateText(platform: string, idea: string, tone: Tone, brandKit?: BrandKit, customInstructions?: string): Promise<PlatformPost> {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  let finalPrompt = `You are an expert social media manager. Generate a ${tone} ${platform} post based on the following idea: "${idea}".`;

  const defaultRule = PLATFORMS.find(p => p.name === platform)?.promptRule || '';

  if (customInstructions && customInstructions.trim()) {
    finalPrompt += ` Follow these specific instructions: "${customInstructions}".`;
  } else if (defaultRule) {
    finalPrompt += ` Follow this rule: "${defaultRule}".`;
  }

  if (brandKit && brandKit.voice) {
    finalPrompt += ` Adopt a ${brandKit.voice} voice.`;
  }

  finalPrompt += ` Respond with only the text for the post.`
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
    });
    
    let postText = response.text;
    if (brandKit) {
        postText = applyBrandLinting(postText, brandKit);
    }

    return { platform, post: postText };
  } catch (error) {
    console.error(`Error generating text for ${platform}:`, error);
    return { platform, post: `Failed to generate content for ${platform}.` };
  }
}

async function processCampaignGeneration(idea: string, tone: Tone, aspectRatio: AspectRatio, brandKitId: string, imageStyle: ImageStyle, generationType: GenerationType, platformConfigs: PlatformConfig[]): Promise<CampaignResult> {
    if (!idea.trim()) {
        throw new Error("Idea cannot be empty.");
    }

    const brandKit = BRAND_KITS.find(bk => bk.id === brandKitId);
    const enabledPlatforms = platformConfigs.filter(p => p.enabled);

    let campaignMedia: { imageUrl?: string; videoUrl?: string };

    if (generationType === 'video') {
        const videoUrl = await generateVideo(idea, aspectRatio, brandKit);
        campaignMedia = { videoUrl };
    } else {
        const imageUrl = await generateImage(idea, aspectRatio, imageStyle, brandKit);
        campaignMedia = { imageUrl };
    }

    const textGenerationPromises = enabledPlatforms.map(config =>
      generateText(config.name, idea, tone, brandKit, config.customInstructions)
    );
    const posts = await Promise.all(textGenerationPromises);
    return { ...campaignMedia, posts };
}

// --- Async Job Queue Simulation ---

export function startCampaignGeneration(idea: string, tone: Tone, aspectRatio: AspectRatio, brandKitId: string, imageStyle: ImageStyle, generationType: GenerationType, platformConfigs: PlatformConfig[]): string {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  jobStore.set(jobId, { id: jobId, status: 'pending' });

  setTimeout(async () => {
    try {
      jobStore.set(jobId, { id: jobId, status: 'processing' });
      
      const result = await processCampaignGeneration(idea, tone, aspectRatio, brandKitId, imageStyle, generationType, platformConfigs);
      
      jobStore.set(jobId, { id: jobId, status: 'completed', result });
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      jobStore.set(jobId, { id: jobId, status: 'failed', error: errorMessage });
    }
  }, 1000);

  return jobId;
}

export function getCampaignJobStatus(jobId: string): Job | null {
  return jobStore.get(jobId) || null;
}