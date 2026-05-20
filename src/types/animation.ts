export type ShapeType = "circle" | "square" | "triangle" | "star";

export type SubjectType =
  | "circle"
  | "square"
  | "star"
  | "triangle"
  | "letter"
  | "number"
  | "animal"
  | "object";

export type EntryStyle = "bounce" | "slide" | "fade" | "pop" | "spin";

export type AnimationTheme =
  | "shapes"
  | "animals"
  | "letters"
  | "numbers"
  | "nature"
  | "space"
  | "default";

export interface SceneConfig {
  layout?: string;
  mainSubject?: string;
  subjectCount?: number;
  subjectPositions?: string;
  hasCharacters?: boolean;
  characterCount?: number;
  characterPositions?: string[];
  backgroundType?: string;
  backgroundDescription?: string;
}

export interface SubjectConfig {
  type: SubjectType | string;
  label?: string | null;
  color: string;
  size?: "small" | "medium" | "large";
  positionX?: number;
  positionY?: number;
}

export interface CharacterConfig {
  hairColor?: string;
  hairStyle?: string;
  shirtColor?: string;
  pantsColor?: string;
  skinColor?: string;
  gender?: string;
  hasGlasses?: boolean;
  positionHint?: "left" | "center" | "right" | string;
  action?: "standing" | "jumping" | "waving" | "pointing" | "running" | string;
}

export interface AnimationHints {
  entryStyle?: EntryStyle | string;
  rhythm?: "slow" | "medium" | "fast" | string;
  mood?: string;
  keyAction?: string;
}

export interface SceneDescription {
  setting?: string;
  timeOfDay?: "day" | "night" | "sunset" | "indoor" | string;
  weather?: "sunny" | "rainy" | "cloudy" | "snowy" | "none" | string;
  backgroundColors?: string[];
  backgroundElements?: string[];
  groundType?: "grass" | "sand" | "water" | "floor" | "none" | string;
  groundColor?: string;
  atmosphere?: "calm" | "playful" | "exciting" | "mysterious" | "cheerful" | string;
  dominantColors?: string[];
}

export interface SpriteAnimationConfig {
  shouldBounce?: boolean;
  bounceStyle?: "gentle" | "energetic" | "none" | string;
  shouldWave?: boolean;
  facingDirection?: "left" | "right" | "forward" | string;
  scaleInScene?: "small" | "medium" | "large" | string;
  hasCompanions?: boolean;
  companionCount?: number;
}

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
  scene?: SceneConfig;
  sceneDescription?: SceneDescription;
  spriteAnimation?: SpriteAnimationConfig;
  subjects?: SubjectConfig[];
  characters?: CharacterConfig[];
  animationHints?: AnimationHints;
  /** @deprecated use shapes */
  circles?: CircleConfig[];
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  theme?: AnimationTheme | string;
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
  /** Set when persisted from AI video generation */
  generatedBy?: "hailuo" | "canvas";
  /** Motion prompt used for Hailuo */
  prompt?: string;
  /** Hailuo generated background music */
  hasAudio?: boolean;
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
