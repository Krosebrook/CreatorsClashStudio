import { GoogleGenAI, Type, Modality } from "@google/genai";
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

async function generateImage(prompt: string, aspectRatio: AspectRatio, imageStyle: ImageStyle, brandKit?: BrandKit, logoDataUrl?: string | null): Promise<string> {
  const cacheKey = JSON.stringify({ prompt, aspectRatio, imageStyle, brandKitId: brandKit?.id || 'none', hasLogo: !!logoDataUrl });
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
    const baseImageResponse = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: finalPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    const baseImageBytes = baseImageResponse.generatedImages?.[0]?.image.imageBytes;
    if (!baseImageBytes) {
      throw new Error("Image generation failed to return an image.");
    }
    
    // If no logo is provided, return the generated image directly
    if (!logoDataUrl) {
        const imageUrl = `data:image/jpeg;base64,${baseImageBytes}`;
        imageCache.set(cacheKey, imageUrl);
        return imageUrl;
    }

    // --- Step 2: Add the logo to the generated image ---
    console.log("Logo provided. Initiating image editing step...");

    const logoMatch = logoDataUrl.match(/data:(.+?);(.*?),(.*)/);
    if (!logoMatch) {
      console.error("Invalid logo data URL format.");
      // Fallback to returning the base image if logo format is incorrect
      return `data:image/jpeg;base64,${baseImageBytes}`;
    }
    const [, mimeType, , logoData] = logoMatch;

    const editResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: baseImageBytes,
              mimeType: 'image/jpeg',
            },
          },
          {
            inlineData: {
              data: logoData,
              mimeType: mimeType,
            },
          },
          {
            text: 'Subtly and tastefully place the second image (the logo) in one of the corners of the first image. The logo should be small and not obscure the main subject of the image. Maintain the original image\'s quality and aspect ratio.',
          },
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    const finalImagePart = editResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (finalImagePart?.inlineData?.data) {
        const finalImageBytes = finalImagePart.inlineData.data;
        const finalMimeType = finalImagePart.inlineData.mimeType;
        const imageUrl = `data:${finalMimeType};base64,${finalImageBytes}`;
        imageCache.set(cacheKey, imageUrl); // Store final image in cache
        return imageUrl;
    } else {
        console.error("Failed to add logo to the image. Returning original image.");
        // Fallback to returning the base image if the editing step fails
        return `data:image/jpeg;base64,${baseImageBytes}`;
    }

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

export async function generateCampaignIdeas(): Promise<string[]> {
  console.log("Generating new campaign ideas...");
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const prompt = `Generate 5 diverse and creative social media campaign ideas for a variety of businesses (tech, retail, food, etc.). The ideas should be concise and actionable, suitable for a text input placeholder.

  Example ideas:
  - Announce our new AI-powered analytics tool for startups
  - A week-long photo challenge for our new camera lens
  - Limited-time 'buy one, get one free' offer on all summer drinks
  - Behind-the-scenes look at how our handmade products are crafted
  - A Q&A session with our CEO about the future of the company

  Respond with ONLY a JSON array of 5 unique strings.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    const ideas = JSON.parse(response.text);
    if (Array.isArray(ideas) && ideas.every(item => typeof item === 'string')) {
      return ideas;
    } else {
      throw new Error("AI response was not a valid array of strings.");
    }
  } catch (error) {
    console.error("Error generating campaign ideas:", error);
    // Provide some fallback ideas on failure
    return [
        "Launch a new eco-friendly product line",
        "Host a weekly 'how-to' video series",
        "Run a customer photo contest on Instagram",
        "Offer a 24-hour flash sale for newsletter subscribers",
        "Collaborate with a popular influencer for a product review"
    ];
  }
}

export async function summarizeIdea(idea: string): Promise<string> {
  if (!idea.trim()) {
    return idea;
  }
  console.log("Summarizing campaign idea...");
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const prompt = `Summarize the following campaign concept into a single, concise, and compelling sentence that can be used as a creative prompt. Respond with ONLY the summarized sentence.

  Concept: "${idea}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error summarizing idea:", error);
    throw new Error("Failed to summarize the idea. Please try again.");
  }
}

async function processCampaignGeneration(idea: string, tone: Tone, aspectRatio: AspectRatio, brandKitId: string, imageStyle: ImageStyle, generationType: GenerationType, platformConfigs: PlatformConfig[], generateAccompanyingImage: boolean, logoDataUrl: string | null): Promise<CampaignResult> {
    if (!idea.trim()) {
        throw new Error("Idea cannot be empty.");
    }

    const brandKit = BRAND_KITS.find(bk => bk.id === brandKitId);
    const enabledPlatforms = platformConfigs.filter(p => p.enabled);

    let imageUrlPromise: Promise<string | null> = Promise.resolve(null);
    let videoUrlPromise: Promise<string | null> = Promise.resolve(null);

    if (generationType === 'image' || (generationType === 'video' && generateAccompanyingImage)) {
        imageUrlPromise = generateImage(idea, aspectRatio, imageStyle, brandKit, logoDataUrl);
    }
    if (generationType === 'video') {
        videoUrlPromise = generateVideo(idea, aspectRatio, brandKit);
    }

    const [imageUrl, videoUrl] = await Promise.all([
        imageUrlPromise,
        videoUrlPromise,
    ]);

    const campaignMediaResult: { imageUrl?: string; videoUrl?: string } = {};
    if (imageUrl) campaignMediaResult.imageUrl = imageUrl;
    if (videoUrl) campaignMediaResult.videoUrl = videoUrl;


    const textGenerationPromises = enabledPlatforms.map(config =>
      generateText(config.name, idea, tone, brandKit, config.customInstructions)
    );
    const posts = await Promise.all(textGenerationPromises);
    return { ...campaignMediaResult, posts };
}

// --- Async Job Queue Simulation ---

export function startCampaignGeneration(idea: string, tone: Tone, aspectRatio: AspectRatio, brandKitId: string, imageStyle: ImageStyle, generationType: GenerationType, platformConfigs: PlatformConfig[], generateAccompanyingImage: boolean, logoDataUrl: string | null): string {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  jobStore.set(jobId, { id: jobId, status: 'pending' });

  setTimeout(async () => {
    try {
      jobStore.set(jobId, { id: jobId, status: 'processing' });
      
      const result = await processCampaignGeneration(idea, tone, aspectRatio, brandKitId, imageStyle, generationType, platformConfigs, generateAccompanyingImage, logoDataUrl);
      
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