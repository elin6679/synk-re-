export interface UserProfile {
  name: string;
  measurements: {
    height?: number;
    shoulder?: number;
    chest?: number;
    waist?: number;
  };
  skinTone?: string;
  settings: {
    speechRate: number;
    speechVolume: number;
    hapticIntensity: number;
    detailMode: 'simple' | 'detailed';
  };
}

export enum AppScreen {
  ONBOARDING = 'onboarding',
  HOME = 'home',
  ANALYSIS = 'analysis',
  CLOSET = 'closet',
  BEAUTY = 'beauty',
  STORE = 'store',
  SETTINGS = 'settings',
  LOGIN = 'login'
}

export interface ClothingItem {
  id: string;
  name: string;
  category: string;
  color: string;
  texture: string;
  material?: 'silk' | 'knit' | 'denim' | 'leather' | 'fur' | 'cotton' | 'linen';
  price?: number;
  wearCount?: number;
  daysSinceLastWorn?: number;
  description: string;
  imageUrl?: string;
  createdAt: number;
}
