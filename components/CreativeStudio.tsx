import React, { useState, useCallback, useEffect } from 'react';
import { startCampaignGeneration, getCampaignJobStatus, generateCampaignIdeas, summarizeIdea } from '../services/geminiService';
import { BRAND_KITS } from '../data/brandKits';
import type { Tone, AspectRatio, CampaignResult, Job, ImageStyle, GenerationType, PlatformConfig, Schedule } from '../types';

const TONES: { value: Tone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'witty', label: 'Witty' },
  { value: 'urgent', label: 'Urgent' },
];

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '1:1', label: 'Square (1:1)' },
  { value: '4:3', label: 'Standard (4:3)' },
  { value: '3:4', label: 'Portrait (3:4)' },
  { value: '9:16', label: 'Story (9:16)' },
];

const IMAGE_STYLES: { value: ImageStyle; label: string }[] = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'photographic', label: 'Photographic' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'digital-art', label: 'Digital Art' },
];

const PLATFORM_DEFAULT_RULES: Record<string, string> = {
    "LinkedIn": "professional post for a business audience, around 1500 characters. Include 3-5 relevant hashtags.",
    "Twitter": "concise and punchy tweet, under 280 characters. Use 1-2 relevant hashtags.",
    "Instagram": "engaging and visually-focused caption, around 150 characters. Include 10-15 relevant hashtags.",
};

const INITIAL_PLATFORM_CONFIGS: PlatformConfig[] = [
    { name: 'LinkedIn', enabled: true, customInstructions: '' },
    { name: 'Twitter', enabled: true, customInstructions: '' },
    { name: 'Instagram', enabled: true, customInstructions: '' },
];


const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col justify-center items-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-500"></div>
        <p className="text-gray-300">{text}</p>
    </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="mt-8 bg-red-900/30 border border-red-800 rounded-lg p-6">
        <div className="flex">
            <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <div className="ml-4">
                <h3 className="text-lg font-bold text-red-300">Campaign Generation Failed</h3>
                <p className="mt-2 text-base text-red-400">{message}</p>
            </div>
        </div>
    </div>
);

const ResultCard: React.FC<{ platform: string; content: string; }> = ({ platform, content }) => (
    <div className="bg-[#161b22]/80 backdrop-blur-sm border border-gray-700 rounded-lg p-6 h-full flex flex-col">
        <h3 className="text-xl font-bold text-white mb-3">{platform}</h3>
        <p className="text-gray-300 whitespace-pre-wrap flex-grow">{content}</p>
    </div>
);

const WandSparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69a.75.75 0 01.981.981A10.501 10.501 0 0118 16.5a10.5 10.5 0 01-10.5-10.5c0-1.79.448-3.473 1.218-4.995a.75.75 0 01.81-.162zM15.023 6.977a.75.75 0 01.018 1.06l-4.12 4.12a.75.75 0 01-1.06-1.06l4.12-4.12a.75.75 0 011.042 0z" clipRule="evenodd" />
        <path d="M11.344 1.344a.75.75 0 011.06 0l1.125 1.125a.75.75 0 010 1.06l-1.125 1.125a.75.75 0 01-1.06 0L10.22 3.53a.75.75 0 010-1.06l1.125-1.125zM14.625 10.375a.75.75 0 011.06 0l1.125 1.125a.75.75 0 010 1.06l-1.125 1.125a.75.75 0 01-1.06 0L13.5 12.56a.75.75 0 010-1.06l1.125-1.125zM18.375 2.625a.75.75 0 011.06 0l1.125 1.125a.75.75 0 010 1.06l-1.125 1.125a.75.75 0 01-1.06 0L17.25 4.81a.75.75 0 010-1.06l1.125-1.125z" />
    </svg>
);

const SummarizeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.5 21.75l-.398-1.178a3.375 3.375 0 00-2.456-2.456L12.75 18l1.178-.398a3.375 3.375 0 002.456-2.456L17.25 14.25l.398 1.178a3.375 3.375 0 002.456 2.456L21 18l-1.178.398a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
);


const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-3.181-4.991v4.99" />
    </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);


export const CreativeStudio: React.FC = () => {
    const [idea, setIdea] = useState('');
    const [tone, setTone] = useState<Tone>('professional');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [imageStyle, setImageStyle] = useState<ImageStyle>('cinematic');
    const [brandKitId, setBrandKitId] = useState<string>('none');
    const [generationType, setGenerationType] = useState<GenerationType>('image');
    const [platformConfigs, setPlatformConfigs] = useState<PlatformConfig[]>(INITIAL_PLATFORM_CONFIGS);
    const [isApiKeySelected, setIsApiKeySelected] = useState<boolean | null>(null);
    const [generateAccompanyingImage, setGenerateAccompanyingImage] = useState(false);
    const [logo, setLogo] = useState<{ name: string; dataUrl: string } | null>(null);
    
    const [job, setJob] = useState<Job | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CampaignResult | null>(null);

    const [suggestedIdeas, setSuggestedIdeas] = useState<string[]>([]);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [isScheduling, setIsScheduling] = useState(false);
    const [isScheduled, setIsScheduled] = useState(false);

    const isProcessing = job?.status === 'pending' || job?.status === 'processing';

    useEffect(() => {
        const checkApiKey = async () => {
            if (generationType === 'video') {
                setIsApiKeySelected(null); // Reset while checking
                // @ts-ignore
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsApiKeySelected(hasKey);
            } else {
                setIsApiKeySelected(true); // Not needed for image, so we can consider it "selected"
            }
        };
        checkApiKey();
    }, [generationType]);

    // Polling effect
    useEffect(() => {
        if (!job || !isProcessing) {
            return;
        }

        const intervalId = setInterval(() => {
            const currentJob = getCampaignJobStatus(job.id);
            if (currentJob) {
                setJob(currentJob);
                if (currentJob.status === 'completed') {
                    setResult(currentJob.result!);
                    if (currentJob.result?.posts) {
                        const initialSchedules = currentJob.result.posts.map(p => ({
                            platform: p.platform,
                            dateTime: '',
                        }));
                        setSchedules(initialSchedules);
                    }
                    setError(null);
                } else if (currentJob.status === 'failed') {
                    setError(currentJob.error!);
                    setResult(null);
                    if (currentJob.error?.includes('API key')) {
                        setIsApiKeySelected(false);
                    }
                }
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(intervalId);
    }, [job, isProcessing]);

    const handleSelectApiKey = async () => {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Assume success and optimistically update UI to avoid race condition
        setIsApiKeySelected(true); 
    };

    const handlePlatformConfigChange = useCallback((index: number, field: keyof PlatformConfig, value: string | boolean) => {
        const newConfigs = [...platformConfigs];
        (newConfigs[index] as any)[field] = value;
        setPlatformConfigs(newConfigs);
    }, [platformConfigs]);
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 2 * 1024 * 1024) { // 2MB limit
              setError("Logo size should not exceed 2MB.");
              return;
          }
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
              setError("Please upload a PNG, JPG, or WEBP file for the logo.");
              return;
          }
          setError(null);
          const reader = new FileReader();
          reader.onloadend = () => {
              setLogo({ name: file.name, dataUrl: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
    };

    const handleGenerateIdeas = useCallback(async () => {
        setIsGeneratingSuggestions(true);
        setIsSuggestionsOpen(true);
        setError(null); // Clear previous errors
        try {
            const ideas = await generateCampaignIdeas();
            setSuggestedIdeas(ideas);
        } catch (error) {
            console.error("Failed to generate ideas:", error);
            setSuggestedIdeas([]);
            setError("Could not load suggestions. Please try again.");
        } finally {
            setIsGeneratingSuggestions(false);
        }
    }, []);

    const handleSummarize = async () => {
        if (!idea.trim()) return;
        setIsSummarizing(true);
        setError(null);
        try {
            const summary = await summarizeIdea(idea);
            setIdea(summary);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not summarize idea.');
        } finally {
            setIsSummarizing(false);
        }
    };


    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!idea.trim()) {
            setError('Please enter a campaign idea.');
            return;
        }
        if (!platformConfigs.some(p => p.enabled)) {
            setError('Please select at least one platform to generate a post for.');
            return;
        }
        
        // Reset state for a new job submission
        setError(null);
        setResult(null);
        setJob(null);
        setLogo(null);
        setIsSuggestionsOpen(false);
        setIsScheduling(false);
        setIsScheduled(false);

        try {
            // Initiate the job. This returns a job ID immediately.
            const jobId = startCampaignGeneration(idea, tone, aspectRatio, brandKitId, imageStyle, generationType, platformConfigs, generateAccompanyingImage, logo?.dataUrl ?? null);
            // Set the job in state, which triggers the polling useEffect to begin.
            setJob({ id: jobId, status: 'pending' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        }
    }, [idea, tone, aspectRatio, brandKitId, imageStyle, generationType, platformConfigs, generateAccompanyingImage, logo]);
    
    const handleScheduleChange = (index: number, dateTime: string) => {
        const newSchedules = [...schedules];
        newSchedules[index].dateTime = dateTime;
        setSchedules(newSchedules);
    };

    const handleConfirmSchedule = () => {
        setIsScheduled(true);
        setIsScheduling(false);
    };

    const handleGenerationTypeChange = (type: GenerationType) => {
        setGenerationType(type);
        if (type === 'image') {
            setGenerateAccompanyingImage(false);
        }
    };

    const getLoadingText = () => {
        if (job?.status === 'pending') return `Job ${job.id} is queued...`;
        if (job?.status === 'processing') {
            if (generationType === 'video') {
                if (generateAccompanyingImage) {
                    return `Processing Video & Image Job ${job.id}... This can take several minutes. Please be patient.`;
                }
                return `Processing Video Job ${job.id}... This can take several minutes. Please be patient.`;
            }
            return `Processing Job ${job.id}... This may take a moment.`;
        }
        return 'Generating...';
    }

    return (
        <section id="studio" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
            <div className="bg-[#161b22]/50 border border-gray-800 rounded-2xl p-6 md:p-10 backdrop-blur-lg">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-2">Creative Studio</h2>
                <p className="text-center text-gray-400 mb-8 max-w-2xl mx-auto">
                    Enter your campaign idea, select your creative output, and let AI do the rest.
                </p>

                 <div className="flex justify-center mb-6">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-1 flex space-x-1">
                        <button type="button" onClick={() => handleGenerationTypeChange('image')} disabled={isProcessing} className={`px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${generationType === 'image' ? 'bg-fuchsia-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Image</button>
                        <button type="button" onClick={() => handleGenerationTypeChange('video')} disabled={isProcessing} className={`px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${generationType === 'video' ? 'bg-fuchsia-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Video</button>
                    </div>
                </div>
                
                {generationType === 'video' && (
                    <div className="flex items-center justify-center mb-6 text-sm text-gray-300 animate-fade-in-down">
                        <input
                            type="checkbox"
                            id="accompanying-image"
                            checked={generateAccompanyingImage}
                            onChange={(e) => setGenerateAccompanyingImage(e.target.checked)}
                            className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-fuchsia-600 focus:ring-fuchsia-500 disabled:opacity-50 mr-2"
                            disabled={isProcessing}
                        />
                        <label htmlFor="accompanying-image">Generate an accompanying static image</label>
                    </div>
                )}


                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                         <div className="flex justify-between items-center mb-2">
                            <label htmlFor="idea" className="block text-sm font-medium text-gray-300">Campaign Idea</label>
                            <button
                                type="button"
                                onClick={handleGenerateIdeas}
                                disabled={isProcessing || isGeneratingSuggestions}
                                className="text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <WandSparklesIcon className="w-4 h-4" />
                                Suggest Ideas
                            </button>
                        </div>
                        <textarea
                            id="idea"
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            placeholder="e.g., Announce our new AI-powered analytics tool for startups"
                            className="w-full h-32 p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition text-white"
                            required
                            disabled={isProcessing}
                        />
                         <button
                            type="button"
                            onClick={handleSummarize}
                            disabled={isProcessing || isSummarizing || !idea.trim()}
                            className="absolute bottom-3 right-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1.5 bg-gray-800/50 hover:bg-gray-700/70 rounded-md flex items-center justify-center"
                            title="Summarize your idea into a single sentence"
                            style={{ width: '32px', height: '32px' }}
                        >
                            {isSummarizing ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-fuchsia-500"></div>
                            ) : (
                                <SummarizeIcon className="w-5 h-5" />
                            )}
                        </button>
                         {isSuggestionsOpen && (
                            <div className="absolute top-full mt-2 w-full bg-[#1e242c] border border-gray-700 rounded-lg shadow-xl z-20 p-4 animate-fade-in-down">
                                {isGeneratingSuggestions ? (
                                    <div className="flex items-center justify-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fuchsia-500"></div>
                                        <span className="ml-3 text-gray-300">Generating fresh ideas...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-bold text-white text-sm">Here are a few ideas:</h4>
                                            <button type="button" onClick={() => setIsSuggestionsOpen(false)} className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors">
                                                <CloseIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                        {suggestedIdeas.length > 0 ? (
                                            <ul className="space-y-2">
                                                {suggestedIdeas.map((idea, index) => (
                                                    <li key={index}>
                                                        <button
                                                            type="button"
                                                            className="w-full text-left p-3 bg-gray-900/60 hover:bg-gray-800/80 rounded-md transition-colors text-gray-300 text-sm"
                                                            onClick={() => {
                                                                setIdea(idea);
                                                                setIsSuggestionsOpen(false);
                                                            }}
                                                        >
                                                            {idea}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-gray-400 text-sm text-center py-4">Could not load suggestions.</p> }
                                        <div className="border-t border-gray-700 mt-4 pt-3 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handleGenerateIdeas}
                                                disabled={isGeneratingSuggestions}
                                                className="text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <RefreshIcon className="w-4 h-4" />
                                                Get New Suggestions
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {generationType === 'video' && isApiKeySelected === false && (
                        <div className="my-4 bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-center">
                            <h4 className="font-bold text-blue-300">API Key Required for Video Generation</h4>
                            <p className="text-blue-400 mt-2 text-sm">
                                The Veo video model requires you to select your own API key. 
                                Please ensure your project has billing enabled. 
                                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200 ml-1">Learn more about billing.</a>
                            </p>
                            <button type="button" onClick={handleSelectApiKey} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                                Select API Key
                            </button>
                        </div>
                    )}


                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="tone" className="block text-sm font-medium text-gray-300 mb-2">Global Tone</label>
                            <select
                                id="tone"
                                value={tone}
                                onChange={(e) => setTone(e.target.value as Tone)}
                                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition text-white"
                                disabled={isProcessing}
                            >
                                {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                            <select
                                id="aspectRatio"
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition text-white"
                                disabled={isProcessing}
                            >
                                {ASPECT_RATIOS.map(ar => <option key={ar.value} value={ar.value}>{ar.label}</option>)}
                            </select>
                        </div>
                        
                         {(generationType === 'image' || generateAccompanyingImage) && (
                             <div>
                                <label htmlFor="imageStyle" className="block text-sm font-medium text-gray-300 mb-2">Image Style</label>
                                <select
                                    id="imageStyle"
                                    value={imageStyle}
                                    onChange={(e) => setImageStyle(e.target.value as ImageStyle)}
                                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition text-white"
                                    disabled={isProcessing}
                                >
                                    {IMAGE_STYLES.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                                </select>
                            </div>
                         )}

                         <div>
                            <label htmlFor="brandKit" className="block text-sm font-medium text-gray-300 mb-2">Brand Kit</label>
                            <select
                                id="brandKit"
                                value={brandKitId}
                                onChange={(e) => setBrandKitId(e.target.value)}
                                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition text-white"
                                disabled={isProcessing}
                            >
                                <option value="none">None</option>
                                {BRAND_KITS.map(bk => <option key={bk.id} value={bk.id}>{bk.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Brand Logo (Optional)</label>
                        <p className="text-xs text-gray-400 mb-3">Upload a logo to incorporate it into the generated image (max 2MB, PNG/JPG/WEBP).</p>
                        
                        {!logo ? (
                            <div className="relative block w-full border-2 border-gray-600 border-dashed rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
                                <UploadIcon className="mx-auto h-8 w-8 text-gray-500" />
                                <span className="mt-2 block text-sm font-medium text-gray-400">
                                    Click to upload a logo
                                </span>
                                <input 
                                    type="file" 
                                    id="logo-upload"
                                    onChange={handleLogoChange}
                                    accept="image/png, image/jpeg, image/webp"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isProcessing}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center space-x-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                                <img src={logo.dataUrl} alt="Logo preview" className="h-12 w-12 object-contain rounded-md bg-white p-1" />
                                <div className="flex-grow">
                                    <p className="text-sm font-medium text-white truncate">{logo.name}</p>
                                    <p className="text-xs text-gray-400">Logo will be added to the image.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLogo(null)}
                                    disabled={isProcessing}
                                    className="p-1.5 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50"
                                    title="Clear logo"
                                >
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-4 border-t border-gray-700 pt-6">
                        <h3 className="text-lg font-medium text-white">Social Posts Configuration</h3>
                        <p className="text-sm text-gray-400">
                            Select which platforms to generate posts for and provide custom instructions. If no instructions are given, default settings will be used.
                        </p>
                        {platformConfigs.map((config, index) => (
                            <div key={config.name} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                <div className="flex items-center justify-between">
                                    <label htmlFor={`check-${config.name}`} className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id={`check-${config.name}`}
                                            checked={config.enabled}
                                            onChange={(e) => handlePlatformConfigChange(index, 'enabled', e.target.checked)}
                                            className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-fuchsia-600 focus:ring-fuchsia-500 disabled:opacity-50"
                                            disabled={isProcessing}
                                        />
                                        <span className="font-bold text-white">{config.name}</span>
                                    </label>
                                </div>
                                {config.enabled && (
                                <div className="mt-3">
                                    <label htmlFor={`instructions-${config.name}`} className="block text-sm font-medium text-gray-400 mb-1">
                                    Custom Instructions (Optional)
                                    </label>
                                    <textarea
                                        id={`instructions-${config.name}`}
                                        value={config.customInstructions}
                                        onChange={(e) => handlePlatformConfigChange(index, 'customInstructions', e.target.value)}
                                        placeholder={`e.g., ${PLATFORM_DEFAULT_RULES[config.name]}`}
                                        className="w-full h-20 p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition text-white disabled:opacity-50"
                                        disabled={isProcessing}
                                    />
                                </div>
                                )}
                            </div>
                        ))}
                    </div>


                    <div>
                        <button type="submit" disabled={isProcessing || (generationType === 'video' && !isApiKeySelected)} className="w-full text-lg font-semibold px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                            {isProcessing ? 'Processing...' : 'Generate Campaign'}
                        </button>
                    </div>
                </form>

                {isProcessing && <LoadingSpinner text={getLoadingText()} />}
                {error && <ErrorDisplay message={error} />}
                
                {result && (
                    <div className="mt-12 space-y-10">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-4 text-center">Generated Creative</h3>
                            <div className="flex justify-center flex-wrap gap-6">
                               {result.imageUrl && <img src={result.imageUrl} alt="Generated campaign visual" className="rounded-lg shadow-2xl shadow-fuchsia-900/20 max-w-full md:max-w-md border-2 border-gray-700"/>}
                               {result.videoUrl && <video src={result.videoUrl} controls autoPlay loop muted className="rounded-lg shadow-2xl shadow-fuchsia-900/20 max-w-full md:max-w-md border-2 border-gray-700"/>}
                            </div>
                        </div>

                        {result.posts.length > 0 && (
                             <div>
                                <h3 className="text-2xl font-bold text-white mb-6 text-center">Generated Posts</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {result.posts.map(p => <ResultCard key={p.platform} platform={p.platform} content={p.post} />)}
                                </div>
                            </div>
                        )}

                        {result.posts.length > 0 && (
                            <div className="mt-12 border-t border-gray-700 pt-8 text-center">
                                {isScheduled ? (
                                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-6 max-w-2xl mx-auto animate-fade-in-down">
                                        <h3 className="text-xl font-bold text-green-300">Posts Scheduled Successfully!</h3>
                                        <ul className="mt-4 space-y-2 text-left text-green-400">
                                            {schedules.filter(s => s.dateTime).map(s => (
                                                <li key={s.platform}>
                                                    <strong>{s.platform}:</strong> {new Date(s.dateTime).toLocaleString()}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <>
                                        {!isScheduling ? (
                                            <button
                                                onClick={() => setIsScheduling(true)}
                                                className="text-lg font-semibold px-8 py-4 bg-transparent border-2 border-fuchsia-500 text-fuchsia-400 rounded-lg hover:bg-fuchsia-900/50 hover:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-fuchsia-500 transition-all duration-300"
                                            >
                                                Schedule Posts
                                            </button>
                                        ) : (
                                            <div className="max-w-2xl mx-auto text-left space-y-6 animate-fade-in-down">
                                                <h3 className="text-2xl font-bold text-white text-center mb-4">Set Your Schedule</h3>
                                                {schedules.map((schedule, index) => (
                                                    <div key={schedule.platform}>
                                                        <label htmlFor={`schedule-${schedule.platform}`} className="block text-sm font-medium text-gray-300 mb-2">{schedule.platform} Schedule Time</label>
                                                        <input
                                                            type="datetime-local"
                                                            id={`schedule-${schedule.platform}`}
                                                            value={schedule.dateTime}
                                                            onChange={(e) => handleScheduleChange(index, e.target.value)}
                                                            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition text-white"
                                                            min={new Date().toISOString().slice(0, 16)}
                                                        />
                                                    </div>
                                                ))}
                                                <div className="flex justify-end gap-4 pt-4">
                                                    <button onClick={() => setIsScheduling(false)} className="px-6 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition">
                                                        Cancel
                                                    </button>
                                                    <button onClick={handleConfirmSchedule} className="px-6 py-2 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700 transition">
                                                        Confirm Schedule
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};