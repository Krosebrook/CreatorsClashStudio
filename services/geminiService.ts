import { GoogleGenAI } from "@google/genai";
import type { Tone, AspectRatio, PlatformPost, Job, CampaignResult, BrandKit } from "../types";
import { BRAND_KITS } from "../data/brandKits";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

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

async function generateImage(prompt: string, aspectRatio: AspectRatio, brandKit?: BrandKit): Promise<string> {
  const cacheKey = JSON.stringify({ prompt, aspectRatio, brandKitId: brandKit?.id || 'none' });
  if (imageCache.has(cacheKey)) {
    console.log("Image cache hit!");
    return imageCache.get(cacheKey)!;
  }
  console.log("Image cache miss. Generating new image...");

  let finalPrompt = `A high-quality, cinematic image representing the concept: "${prompt}". Clean, professional, with negative space. No text on the image.`;
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
    throw new Error("Failed to generate image. Please check your API key and prompt.");
  }
}

async function generateText(platform: string, rule: string, idea: string, tone: Tone, brandKit?: BrandKit): Promise<PlatformPost> {
  let finalPrompt = `You are an expert social media manager. Generate a ${tone} ${platform} post based on the following idea: "${idea}". Follow this rule: "${rule}".`;

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

async function processCampaignGeneration(idea: string, tone: Tone, aspectRatio: AspectRatio, brandKitId: string): Promise<CampaignResult> {
    if (!idea.trim()) {
        throw new Error("Idea cannot be empty.");
    }

    const brandKit = BRAND_KITS.find(bk => bk.id === brandKitId);

    const imageUrl = await generateImage(idea, aspectRatio, brandKit);
    const textGenerationPromises = PLATFORMS.map(p =>
      generateText(p.name, p.promptRule, idea, tone, brandKit)
    );
    const posts = await Promise.all(textGenerationPromises);
    return { imageUrl, posts };
}

// --- Async Job Queue Simulation ---

export function startCampaignGeneration(idea: string, tone: Tone, aspectRatio: AspectRatio, brandKitId: string): string {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  jobStore.set(jobId, { id: jobId, status: 'pending' });

  setTimeout(async () => {
    try {
      jobStore.set(jobId, { id: jobId, status: 'processing' });
      
      const result = await processCampaignGeneration(idea, tone, aspectRatio, brandKitId);
      
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
