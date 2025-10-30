import React, { useState, useCallback, useEffect } from 'react';
import { startCampaignGeneration, getCampaignJobStatus } from '../services/geminiService';
import { BRAND_KITS } from '../data/brandKits';
import type { Tone, AspectRatio, CampaignResult, Job } from '../types';

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

const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col justify-center items-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-500"></div>
        <p className="text-gray-300">{text}</p>
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
    const [brandKitId, setBrandKitId] = useState<string>('none');
    
    const [job, setJob] = useState<Job | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CampaignResult | null>(null);

    const isProcessing = job?.status === 'pending' || job?.status === 'processing';

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
                }
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(intervalId);
    }, [job, isProcessing]);


    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!idea.trim()) {
            setError('Please enter a campaign idea.');
            return;
        }
        
        // Reset state for a new job submission
        setError(null);
        setResult(null);
        setJob(null);

        try {
            // Initiate the job. This returns a job ID immediately.
            const jobId = startCampaignGeneration(idea, tone, aspectRatio, brandKitId);
            // Set the job in state, which triggers the polling useEffect to begin.
            setJob({ id: jobId, status: 'pending' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        }
    }, [idea, tone, aspectRatio, brandKitId]);

    const getLoadingText = () => {
        if (job?.status === 'pending') return `Job ${job.id} is queued...`;
        if (job?.status === 'processing') return `Processing Job ${job.id}... This may take a moment.`;
        return 'Generating...';
    }

    return (
        <section id="studio" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
            <div className="bg-[#161b22]/50 border border-gray-800 rounded-2xl p-6 md:p-10 backdrop-blur-lg">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-2">Creative Studio</h2>
                <p className="text-center text-gray-400 mb-8 max-w-2xl mx-auto">
                    Enter your campaign idea, select your tone and desired image aspect ratio, and let AI do the rest.
                </p>

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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="tone" className="block text-sm font-medium text-gray-300 mb-2">Tone</label>
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
                            <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300 mb-2">Image Aspect Ratio</label>
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

                    <div>
                        <button type="submit" disabled={isProcessing} className="w-full text-lg font-semibold px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                            {isProcessing ? 'Processing...' : 'Generate Campaign'}
                        </button>
                    </div>
                </form>

                {isProcessing && <LoadingSpinner text={getLoadingText()} />}
                {error && <div className="mt-8 text-center text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}
                
                {result && (
                    <div className="mt-12 space-y-10">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-4 text-center">Generated Image</h3>
                            <div className="flex justify-center">
                                <img src={result.imageUrl} alt="Generated campaign visual" className="rounded-lg shadow-2xl shadow-fuchsia-900/20 max-w-full md:max-w-2xl border-2 border-gray-700"/>
                            </div>
                        </div>

                        <div>
                             <h3 className="text-2xl font-bold text-white mb-6 text-center">Generated Posts</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {result.posts.map(p => <ResultCard key={p.platform} platform={p.platform} content={p.post} />)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};