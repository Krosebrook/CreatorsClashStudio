
import React from 'react';
import { CreativeStudio } from './components/CreativeStudio';

const FlashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path d="M11.983 1.904a1.25 1.25 0 00-1.966 0L2.342 9.539a1.25 1.25 0 00.983 2.125h3.425l-2.43 5.462a1.25 1.25 0 002.165 1.545L17.658 9.2a1.25 1.25 0 00-.983-2.125H13.25l2.43-5.462a1.25 1.25 0 00-2.165-1.545L11.983 1.904z" />
    </svg>
);

const Header: React.FC = () => (
    <header className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
                <div className="flex-shrink-0">
                    <a href="#" className="flex items-center gap-2 text-2xl font-bold text-white">
                        <FlashIcon className="w-6 h-6 text-orange-400" />
                        FlashFusion
                    </a>
                </div>
                <div className="hidden md:flex items-center space-x-4">
                    <a href="#" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition">Sign In</a>
                    <a href="#" className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:from-orange-600 hover:to-red-700 transition">Get Started</a>
                </div>
            </div>
        </div>
    </header>
);

const Hero: React.FC = () => {
    const handleScrollToStudio = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="relative pt-32 pb-20 md:pt-48 md:pb-32 text-center">
             <div className="absolute inset-0 -z-10 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
             <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-fuchsia-900/30 to-transparent -z-10"></div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
                Create. Campaign. <br className="md:hidden" />
                <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Conquer.</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-gray-300">
                The AI-powered creative studio that generates content, plans campaigns, and schedules posts across all platforms.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                    onClick={handleScrollToStudio}
                    className="w-full sm:w-auto text-lg font-semibold px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 transition-all duration-300"
                >
                    Start Creating Free
                </button>
                <button className="w-full sm:w-auto text-lg font-semibold px-8 py-4 bg-transparent border-2 border-gray-600 text-white rounded-lg hover:bg-gray-800 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition-all duration-300">
                    View Demo
                </button>
            </div>
        </div>
    );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-[#161b22]/50 border border-gray-800 rounded-xl p-6 text-center flex flex-col items-center">
        <div className="mb-4 text-orange-400">{icon}</div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{children}</p>
    </div>
);

const WandIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.47 2.118L2.25 12l2.25.002.501.223a3.75 3.75 0 0 1 4.242 4.242l.224.502a2.25 2.25 0 0 1 2.118-2.47 3 3 0 0 0 1.128-5.78Zm1.378-3.963a11.182 11.182 0 0 0-3.473 0l-3.473 0a1.125 1.125 0 0 1-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125l3.473 0 3.473 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125Zm-6.94-7.5a1.125 1.125 0 0 1 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5Zm12.19-2.25a1.125 1.125 0 0 1 1.125-1.125h1.5a1.125 1.125 0 0 1 1.125 1.125v1.5a1.125 1.125 0 0 1-1.125 1.125h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5Z" />
    </svg>
);
const GridIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 8.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
);
const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18M12 15.75h.008v.008H12v-.008Z" />
    </svg>
);


const Features: React.FC = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white">
                Everything You Need to <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Dominate</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
                From ideation to execution, FlashFusion provides all the tools modern creators need.
            </p>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard icon={<WandIcon className="w-10 h-10" />} title="AI Content Generation">
                Instantly create compelling copy and stunning visuals for any platform from a single idea.
            </FeatureCard>
            <FeatureCard icon={<GridIcon className="w-10 h-10" />} title="Multi-Platform Tailoring">
                Automatically adapts your content for LinkedIn, Twitter, Instagram, and more, optimizing for each audience.
            </FeatureCard>
            <FeatureCard icon={<CalendarIcon className="w-10 h-10" />} title="Campaign Planning">
                Outline entire social media campaigns, from posts to schedules, ensuring a consistent and powerful message.
            </FeatureCard>
        </div>
    </div>
);


function App() {
  return (
    <div className="bg-[#0d1117] min-h-screen">
      <Header />
      <main>
        <Hero />
        <Features />
        <CreativeStudio />
      </main>
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-800">
        <p className="text-center text-gray-500">&copy; {new Date().getFullYear()} FlashFusion. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
