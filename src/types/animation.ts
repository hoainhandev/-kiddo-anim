export type ShapeType = "circle" | "square" | "triangle" | "star";

export type AnimationBackground =
  | "sky"
  | "space"
  | "ocean"
  | "farm"
  | "classroom";

export type AnimationSpeed = "slow" | "normal" | "fast";

export type AnimationTextSize = "small" | "medium" | "large";

export type AnimationCharacterStyle = "happy" | "excited" | "calm";

export interface AnimationOptions {
  kidCount: 1 | 2 | 3;
  background: AnimationBackground;
  speed: AnimationSpeed;
  hasConfetti: boolean;
  hasParticles: boolean;
  characterStyle: AnimationCharacterStyle;
  textSize: AnimationTextSize;
  duration: 8 | 10 | 15;
}

export const DEFAULT_ANIMATION_OPTIONS: AnimationOptions = {
  kidCount: 3,
  background: "sky",
  speed: "normal",
  duration: 10,
  hasConfetti: true,
  hasParticles: true,
  textSize: "medium",
  characterStyle: "happy",
};

export interface KidConfig {
  bodyColor: string;
  hairColor: string;
  skinTone: string;
  name?: string;
}

export interface LyricLine {
  text: string;
  startMs: number;
  endMs: number;
}

export interface CircleConfig {
  /** Milliseconds into the animation when the shape appears */
  timeMs: number;
  /** Normalized x position (0–1) */
  x: number;
  /** Normalized y position (0–1) */
  y: number;
  radius: number;
  color: string;
  shape: ShapeType;
}

export interface AnimationConfig {
  title: string;
  subtitle: string | null;
  kids?: KidConfig[];
  lyrics: LyricLine[] | string[];
  shapes?: ShapeType[] | string[];
  /** @deprecated use shapes */
  circles?: CircleConfig[];
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  theme?: string;
  kidCount?: number;
  mood?: string;
  /** Scene & export options (from UI + merged from analyze API) */
  background?: AnimationBackground;
  speed?: AnimationSpeed;
  hasConfetti?: boolean;
  hasParticles?: boolean;
  characterStyle?: AnimationCharacterStyle;
  textSize?: AnimationTextSize;
  duration?: 8 | 10 | 15;
}

export interface Video {
  id: string;
  title: string;
  animation_config: AnimationConfig;
  thumbnail_url: string | null;
  mp4_url: string | null;
  duration: number | null;
  created_at: string;
}
