export type ParticleShape = 'tree' | 'sphere' | 'flower';

export interface GestureState {
  isHandDetected: boolean;
  collapseFactor: number; // 0 (open) to 1 (fist)
  rotationX: number; // Normalized -1 to 1 based on hand position
  pinchDistance: number; // 0 to 1
}

export interface ParticleConfig {
  count: number;
  color: string;
  size: number;
  shape: ParticleShape;
}