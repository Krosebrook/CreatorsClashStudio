import React, { useState, useCallback, useEffect } from 'react';
import { startCampaignGeneration, getCampaignJobStatus } from '../services/geminiService';
import { BRAND_KITS } from '../data/brandKits';
import type { Tone, AspectRatio, CampaignResult, Job, ImageStyle, GenerationType, PlatformConfig } from '../types';

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

export const CreativeStudio: React.FC = () => {
    const [idea, setIdea] = useState('');
    const [tone, setTone] = useState<Tone>('professional');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [imageStyle, setImageStyle] = useState<ImageStyle>('cinematic');
    const [brandKitId, setBrandKitId] = useState<string>('none');
    const [generationType, setGenerationType] = useState<GenerationType>('image');
    const [platformConfigs, setPlatformConfigs] = useState<PlatformConfig[]>(INITIAL_PLATFORM_CONFIGS);
    const [isApiKeySelected, setIsApiKeySelected] = useState<boolean | null>(null);
    
    const [job, setJob] = useState<Job | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CampaignResult | null>(null);

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

        try {
            // Initiate the job. This returns a job ID immediately.
            const jobId = startCampaignGeneration(idea, tone, aspectRatio, brandKitId, imageStyle, generationType, platformConfigs);
            // Set the job in state, which triggers the polling useEffect to begin.
            setJob({ id: jobId, status: 'pending' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        }
    }, [idea, tone, aspectRatio, brandKitId, imageStyle, generationType, platformConfigs]);

    const getLoadingText = () => {
        if (job?.status === 'pending') return `Job ${job.id} is queued...`;
        if (job?.status === 'processing') {
            if (generationType === 'video') {
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

                 <div className="flex justify-center mb-8">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-1 flex space-x-1">
                        <button type="button" onClick={() => setGenerationType('image')} disabled={isProcessing} className={`px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${generationType === 'image' ? 'bg-fuchsia-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Image</button>
                        <button type="button" onClick={() => setGenerationType('video')} disabled={isProcessing} className={`px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${generationType === 'video' ? 'bg-fuchsia-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Video</button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="idea" className="block text-sm font-medium text-gray-300 mb-2">Campaign Idea</label>
                        <textarea
                            id="idea"
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            placeholder="e.g., Announce our new AI-powered analytics tool for startups"
                            className="w-full h-32 p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition text-white"
                            required
                            disabled={isProcessing}
                        />
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
                        
                         {generationType === 'image' && (
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
                            <div className="flex justify-center">
                               {result.imageUrl && <img src={result.imageUrl} alt="Generated campaign visual" className="rounded-lg shadow-2xl shadow-fuchsia-900/20 max-w-full md:max-w-2xl border-2 border-gray-700"/>}
                               {result.videoUrl && <video src={result.videoUrl} controls autoPlay loop muted className="rounded-lg shadow-2xl shadow-fuchsia-900/20 max-w-full md:max-w-2xl border-2 border-gray-700"/>}
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
                    </div>
                )}
            </div>
        </section>
    );
};