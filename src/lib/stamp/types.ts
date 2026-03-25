export type StampShape = "circle" | "square";

export type StampAngle = 0 | 15 | 30 | 45;

export type TextureLevel = "mvp";

export type TextKind = "jp" | "latin" | "mixed";

export interface StampOptions {
  text: string;
  shape: StampShape;
  angle: StampAngle;
  size: number;
  texture: TextureLevel;
}

export interface TextProfile {
  sanitized: string;
  graphemes: string[];
  weightedLength: number;
  textKind: TextKind;
  isEmpty: boolean;
  isTooLong: boolean;
  isCircleEligible: boolean;
  warnings: string[];
}

export interface StampLayoutLine {
  text: string;
  units: number;
}

export interface StampLayout {
  lines: StampLayoutLine[];
  fontSize: number;
  lineGap: number;
  strokeWidth: number;
  innerSize: number;
  frameInset: number;
}
