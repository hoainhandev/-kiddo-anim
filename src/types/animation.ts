export type ShapeType = "circle" | "square" | "triangle" | "star";

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
}

export interface Video {
  id: string;
  title: string;
  subtitle: string;
  config: AnimationConfig;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

export interface SaveVideoParams {
  title: string;
  subtitle: string;
  config: AnimationConfig;
  video_url: string;
  thumbnail_url?: string;
}
