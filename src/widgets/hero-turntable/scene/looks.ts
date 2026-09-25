import type { Skin } from '@/shared/theme';

export interface MaterialSpec {
  color: string;
  roughness: number;
  metalness?: number;
  /** MeshPhysicalMaterial transmission – glass */
  transmission?: number;
  thickness?: number;
  ior?: number;
  iridescence?: number;
  clearcoat?: number;
}

export type DeckKind = 'minimal' | 'retro' | 'pixel' | 'glass';

/** How the hero is rendered for a skin; the deck itself (shape, palette, details) lives in `decks/<kind>.ts`. */
export interface Look {
  deck: DeckKind;
  /** radial segments – low for the pixel skin */
  segments: number;
  /** toon + flat shading, rendered at low resolution and scaled up without smoothing */
  pixelated: boolean;
  lights: { key: string; keyIntensity: number; rim: string; ambient: string; env: number };
}

export const LOOKS: Record<Skin, Look> = {
  // soft studio light, nothing tinted
  minimal: {
    deck: 'minimal',
    segments: 64,
    pixelated: false,
    lights: { key: '#ffffff', keyIntensity: 1.6, rim: '#ffffff', ambient: '#5a5854', env: 0.8 },
  },
  // warm late-afternoon sun
  retro: {
    deck: 'retro',
    segments: 48,
    pixelated: false,
    lights: { key: '#ffc978', keyIntensity: 2.6, rim: '#b08d57', ambient: '#3a2616', env: 0.4 },
  },
  // flat CRT light – the palette does the work
  pixel: {
    deck: 'pixel',
    segments: 8,
    pixelated: true,
    lights: { key: '#ffffff', keyIntensity: 2.2, rim: '#3ee6ff', ambient: '#6a5a8a', env: 0 },
  },
  // bright room reflections for the glass
  glass: {
    deck: 'glass',
    segments: 64,
    pixelated: false,
    lights: { key: '#ffffff', keyIntensity: 1.8, rim: '#ffffff', ambient: '#2a3350', env: 1.2 },
  },
};
