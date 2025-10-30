import type { BrandKit } from '../types';

export const BRAND_KITS: BrandKit[] = [
  {
    id: 'bk_1',
    name: "TechGlow Inc.",
    colors: ['#4A90E2', '#50E3C2', '#0D1117'],
    voice: "innovative and forward-thinking",
    bannedWords: ['simple', 'basic', 'easy'],
  },
  {
    id: 'bk_2',
    name: "EcoVibe Organics",
    colors: ['#7ED321', '#F5A623', '#417505'],
    voice: "friendly, earthy, and trustworthy",
    bannedWords: ['artificial', 'chemical', 'processed'],
  },
  {
    id: 'bk_3',
    name: "Quantum Leap Finance",
    colors: ['#1A237E', '#C5CAE9', '#FFFFFF'],
    voice: "authoritative, secure, and professional",
    bannedWords: ['gamble', 'bet', 'luck'],
  },
];
