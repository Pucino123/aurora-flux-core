import type { SoundKey } from "./soundGenerators";

export interface SoundSlot {
  key: SoundKey;
  label: string;
  emoji: string;
}

export const ALL_AMBIANCE_SOUNDS: SoundSlot[] = [
  { key: "deltaWaves", label: "Delta Waves", emoji: "🌌" },
  { key: "thetaWaves", label: "Theta Waves", emoji: "🧠" },
  { key: "rain",       label: "Rain",        emoji: "🌧️" },
  { key: "cafe",       label: "Cafe",        emoji: "☕" },
  { key: "fire",       label: "Fireplace",   emoji: "🔥" },
  { key: "lava",       label: "Lava",        emoji: "🌋" },
  { key: "waves",      label: "Ocean",       emoji: "🌊" },
  { key: "keyboard",   label: "Keyboard Typing", emoji: "⌨️" },
  { key: "wind",       label: "Wind",        emoji: "💨" },
  { key: "brownNoise", label: "Brown Noise", emoji: "🔈" },
];

export interface SceneSoundSlot {
  key: SoundKey;
  label: string;
}

const DEFAULT_SOUNDSCAPE: SceneSoundSlot[] = [
  { key: "rain", label: "Rain" },
  { key: "brownNoise", label: "Ambient Hum" },
  { key: "wind", label: "Breeze" },
];

export const SCENE_SOUNDSCAPE: Record<string, SceneSoundSlot[]> = {
  "cozy-fireplace": [{ key: "fire", label: "Crackling Fire" }, { key: "wind", label: "Soft Wind" }, { key: "brownNoise", label: "Deep Hum" }],
  "cozy-library": [{ key: "rain", label: "Quiet Rain" }, { key: "cafe", label: "Warm Ambience" }, { key: "brownNoise", label: "Soft Hum" }],
  "nature-ocean": [{ key: "waves", label: "Ocean Waves" }, { key: "wind", label: "Sea Breeze" }, { key: "rain", label: "Distant Rain" }],
  "nature-forest": [{ key: "wind", label: "Forest Wind" }, { key: "rain", label: "Bird Rain" }, { key: "brownNoise", label: "Deep Woods" }],
  "nature-rain": [{ key: "rain", label: "Heavy Rain" }, { key: "brownNoise", label: "Thunder Rumble" }, { key: "wind", label: "Wind Gusts" }],
  "urban-tokyo": [{ key: "cafe", label: "City Murmur" }, { key: "rain", label: "Distant Rain" }, { key: "brownNoise", label: "Night Hum" }],
  "urban-cafe": [{ key: "cafe", label: "Cafe Chatter" }, { key: "rain", label: "Rain Outside" }, { key: "fire", label: "Warm Crackle" }],
  "scenic-beach": [{ key: "waves", label: "Waves Lapping" }, { key: "wind", label: "Tropical Breeze" }, { key: "cafe", label: "Distant Murmur" }],
  "scenic-sakura": [{ key: "wind", label: "Gentle Breeze" }, { key: "brownNoise", label: "Soft Ambience" }, { key: "rain", label: "Light Rain" }],
  "cine-clouds": [{ key: "wind", label: "Sky Wind" }, { key: "brownNoise", label: "Deep Drone" }, { key: "rain", label: "Soft Rain" }],
};

export function getSoundscape(backgroundId: string): SceneSoundSlot[] {
  if (SCENE_SOUNDSCAPE[backgroundId]) return SCENE_SOUNDSCAPE[backgroundId];
  return DEFAULT_SOUNDSCAPE;
}

export const SOUND_PRESETS: Record<string, Record<string, number>> = {
  "cozy-fireplace": { fire: 0.3, wind: 0.1, brownNoise: 0.15 },
  "cozy-library":   { rain: 0.1, cafe: 0.15, brownNoise: 0.05 },
  "nature-ocean":   { waves: 0.4, wind: 0.15, rain: 0.05 },
  "nature-forest":  { wind: 0.2, rain: 0.1, brownNoise: 0.1 },
  "nature-rain":    { rain: 0.5, brownNoise: 0.15, wind: 0.1 },
  "urban-tokyo":    { cafe: 0.2, rain: 0.05, brownNoise: 0.1 },
  "urban-cafe":     { cafe: 0.4, rain: 0.1, fire: 0.1 },
  "scenic-beach":   { waves: 0.35, wind: 0.15, cafe: 0.05 },
  "scenic-sakura":  { wind: 0.15, brownNoise: 0.1, rain: 0.05 },
  "cine-clouds":    { wind: 0.2, brownNoise: 0.15, rain: 0.05 },
};
