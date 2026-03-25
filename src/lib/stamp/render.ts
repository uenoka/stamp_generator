import {
  LATIN_FONT,
  PREVIEW_SIZE,
  STAMP_RED,
  STAMP_RED_DARK,
  STAMP_RED_LIGHT,
} from "@/lib/stamp/constants";
import { createStampLayout, getStampBounds, resolveShape } from "@/lib/stamp/layout";
import type { StampOptions, TextProfile } from "@/lib/stamp/types";
import { pickFontFamily } from "@/lib/stamp/text";

interface Rgba {
  r: number;
  g: number;
  b: number;
}

function createSeed(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): Rgba {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function mixColor(from: Rgba, to: Rgba, amount: number): Rgba {
  return {
    r: Math.round(from.r + (to.r - from.r) * amount),
    g: Math.round(from.g + (to.g - from.g) * amount),
    b: Math.round(from.b + (to.b - from.b) * amount),
  };
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function hash2d(x: number, y: number, seed: number) {
  let value = Math.imul(x ^ (seed * 374761393), 668265263);
  value = Math.imul(value ^ (y * 2246822519), 3266489917);
  value ^= value >>> 13;
  value = Math.imul(value, 1274126177);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);

  const top = hash2d(x0, y0, seed) * (1 - tx) + hash2d(x1, y0, seed) * tx;
  const bottom = hash2d(x0, y1, seed) * (1 - tx) + hash2d(x1, y1, seed) * tx;

  return top * (1 - ty) + bottom * ty;
}

function createCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function fitFontSize(
  context: CanvasRenderingContext2D,
  lines: string[],
  maxWidth: number,
  baseSize: number,
  fontFamily: string,
) {
  let fontSize = baseSize;

  while (fontSize > 28) {
    context.font = `700 ${fontSize}px ${fontFamily}`;
    const widest = Math.max(...lines.map((line) => context.measureText(line).width));

    if (widest <= maxWidth) {
      break;
    }

    fontSize -= 2;
  }

  return fontSize;
}

function createShapePath(
  context: CanvasRenderingContext2D,
  shape: StampOptions["shape"],
  size: number,
) {
  const half = size / 2;

  context.beginPath();

  if (shape === "circle") {
    context.arc(0, 0, half, 0, Math.PI * 2);
    return;
  }

  const radius = size * 0.08;
  context.roundRect(-half, -half, size, size, radius);
}

function drawFrame(
  context: CanvasRenderingContext2D,
  shape: StampOptions["shape"],
  size: number,
  strokeWidth: number,
  withHighlight = false,
) {
  createShapePath(context, shape, size);
  context.lineWidth = strokeWidth;
  context.strokeStyle = STAMP_RED;
  context.stroke();

  if (!withHighlight) {
    return;
  }

  context.save();
  context.translate(1.4, -1.2);
  context.globalAlpha = 0.34;
  createShapePath(context, shape, size);
  context.lineWidth = strokeWidth - 3;
  context.strokeStyle = STAMP_RED_LIGHT;
  context.stroke();
  context.restore();
}

function drawText(
  context: CanvasRenderingContext2D,
  profile: TextProfile,
  shape: StampOptions["shape"],
  size: number,
  withHighlight = false,
) {
  const layout = createStampLayout(profile, shape);
  const fontFamily = pickFontFamily(profile.textKind) || LATIN_FONT;
  const maxWidth = layout.innerSize;
  const fontSize = fitFontSize(
    context,
    layout.lines.map((line) => line.text),
    maxWidth,
    layout.fontSize,
    fontFamily,
  );
  const totalHeight =
    fontSize * layout.lines.length + layout.lineGap * Math.max(0, layout.lines.length - 1);
  const startY = -totalHeight / 2 + fontSize * 0.78;

  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.font = `700 ${fontSize}px ${fontFamily}`;
  context.lineJoin = "round";
  context.strokeStyle = STAMP_RED;
  context.fillStyle = STAMP_RED;

  layout.lines.forEach((line, index) => {
    const y = startY + index * (fontSize + layout.lineGap);

    context.save();
    context.globalAlpha = 0.93;
    context.lineWidth = fontSize * 0.08;
    context.strokeText(line.text, 0, y);
    context.fillText(line.text, 0, y);
    context.restore();

    if (!withHighlight) {
      return;
    }

    context.save();
    context.translate(1.2, -0.8);
    context.globalAlpha = 0.18;
    context.fillStyle = STAMP_RED_LIGHT;
    context.fillText(line.text, 0, y);
    context.restore();
  });

  if (shape === "circle" && layout.lines.length === 1 && profile.weightedLength <= 2.2) {
    context.save();
    context.globalAlpha = 0.12;
    context.strokeStyle = STAMP_RED_DARK;
    context.lineWidth = fontSize * 0.18;
    context.strokeText(layout.lines[0].text, 0, startY);
    context.restore();
  }
}

function drawBaseStamp(
  context: CanvasRenderingContext2D,
  profile: TextProfile,
  shape: StampOptions["shape"],
  angle: number,
  withHighlight = false,
) {
  const { center, bodySize } = getStampBounds();

  context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  context.save();
  context.translate(center, center);
  context.rotate((angle * Math.PI) / 180);
  drawFrame(context, shape, bodySize, shape === "circle" ? 12 : 14, withHighlight);
  drawText(context, profile, shape, bodySize, withHighlight);
  context.restore();
}

function addScratchMask(
  context: CanvasRenderingContext2D,
  rng: () => number,
  center: number,
  radius: number,
) {
  context.save();
  context.translate(center, center);
  context.lineCap = "round";
  context.strokeStyle = "rgba(255,255,255,1)";

  for (let index = 0; index < 28; index += 1) {
    const start = rng() * Math.PI * 2;
    const arc = 0.06 + rng() * 0.18;
    const dist = radius * (0.2 + rng() * 0.72);
    const width = 0.8 + rng() * 2.8;

    context.beginPath();
    context.globalAlpha = 0.08 + rng() * 0.12;
    context.lineWidth = width;
    context.arc(0, 0, dist, start, start + arc);
    context.stroke();
  }

  for (let index = 0; index < 22; index += 1) {
    const angle = rng() * Math.PI * 2;
    const length = radius * (0.06 + rng() * 0.2);
    const distance = radius * (rng() * 0.72);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const dx = Math.cos(angle + (rng() - 0.5) * 0.5) * length;
    const dy = Math.sin(angle + (rng() - 0.5) * 0.5) * length;

    context.beginPath();
    context.globalAlpha = 0.12 + rng() * 0.16;
    context.lineWidth = 0.7 + rng() * 2.2;
    context.moveTo(x, y);
    context.lineTo(x + dx, y + dy);
    context.stroke();
  }

  context.restore();
}

function createScratchCanvas(seed: number) {
  const canvas = createCanvas(PREVIEW_SIZE);
  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const rng = mulberry32(seed ^ 0x9e3779b9);
  const center = PREVIEW_SIZE / 2;
  addScratchMask(context, rng, center, PREVIEW_SIZE * 0.32);

  return canvas;
}

function distressStamp(baseCanvas: HTMLCanvasElement, seed: number) {
  const context = baseCanvas.getContext("2d");

  if (!context) {
    return baseCanvas;
  }

  const scratchCanvas = createScratchCanvas(seed);
  const scratchContext = scratchCanvas.getContext("2d");
  const image = context.getImageData(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  const scratchImage = scratchContext?.getImageData(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  const pixels = image.data;
  const scratchPixels = scratchImage?.data;
  const dark = hexToRgb(STAMP_RED_DARK);
  const mid = hexToRgb(STAMP_RED);
  const light = hexToRgb(STAMP_RED_LIGHT);

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];

    if (alpha === 0) {
      continue;
    }

    const pixelIndex = index / 4;
    const x = pixelIndex % PREVIEW_SIZE;
    const y = Math.floor(pixelIndex / PREVIEW_SIZE);
    const xNoise = valueNoise(x * 0.018, y * 0.018, seed ^ 0xa341316c);
    const yNoise = valueNoise(x * 0.043, y * 0.033, seed ^ 0xc8013ea4);
    const blotch = valueNoise(x * 0.008, y * 0.008, seed ^ 0xad90777d);
    const drag = valueNoise(x * 0.012 + y * 0.026, y * 0.01, seed ^ 0x7e95761e);
    const edgeWear = (255 - alpha) / 255;
    const scratch = scratchPixels ? scratchPixels[index + 3] / 255 : 0;
    const wear =
      Math.max(0, 0.54 - xNoise) * 0.28 +
      Math.max(0, 0.48 - yNoise) * 0.22 +
      Math.max(0, 0.42 - drag) * 0.22 +
      Math.max(0, 0.45 - blotch) * 0.14 +
      scratch * 0.55 +
      edgeWear * (0.18 + Math.max(0, 0.5 - xNoise) * 0.32);

    const alphaScale = Math.max(0.38, 1 - wear);
    const density = Math.min(1, 0.36 + blotch * 0.42 + drag * 0.22);
    const shaded = mixColor(dark, mid, density);
    const tinted = mixColor(shaded, light, Math.max(0, yNoise - 0.72) * 0.7);

    pixels[index] = tinted.r;
    pixels[index + 1] = tinted.g;
    pixels[index + 2] = tinted.b;
    pixels[index + 3] = Math.round(alpha * alphaScale);
  }

  context.putImageData(image, 0, 0);

  context.save();
  context.globalCompositeOperation = "destination-out";
  context.drawImage(scratchCanvas, 0, 0);
  context.restore();

  return baseCanvas;
}

function createBleedCanvas(source: HTMLCanvasElement) {
  const bleedCanvas = createCanvas(PREVIEW_SIZE);
  const bleedContext = bleedCanvas.getContext("2d");

  if (!bleedContext) {
    return bleedCanvas;
  }

  bleedContext.save();
  bleedContext.filter = "blur(1.6px)";
  bleedContext.globalAlpha = 0.22;
  bleedContext.drawImage(source, 0, 0);
  bleedContext.restore();

  return bleedCanvas;
}

export function renderStamp(
  canvas: HTMLCanvasElement,
  profile: TextProfile,
  options: StampOptions,
) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const shape = resolveShape(profile, options.shape);
  const seed = createSeed(`${profile.sanitized}-${shape}-${options.angle}-${options.size}`);
  const baseCanvas = createCanvas(PREVIEW_SIZE);
  const baseContext = baseCanvas.getContext("2d");

  canvas.width = PREVIEW_SIZE;
  canvas.height = PREVIEW_SIZE;

  context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

  if (!baseContext) {
    return;
  }

  drawBaseStamp(baseContext, profile, shape, options.angle, false);
  distressStamp(baseCanvas, seed);

  const bleedCanvas = createBleedCanvas(baseCanvas);
  const highlightCanvas = createCanvas(PREVIEW_SIZE);
  const highlightContext = highlightCanvas.getContext("2d");

  if (highlightContext) {
    drawBaseStamp(highlightContext, profile, shape, options.angle, true);
    highlightContext.globalCompositeOperation = "destination-in";
    highlightContext.drawImage(baseCanvas, 0, 0);
    highlightContext.globalCompositeOperation = "source-over";
  }

  context.save();
  context.globalAlpha = 0.16;
  context.drawImage(bleedCanvas, 0, 4);
  context.restore();

  context.drawImage(bleedCanvas, 0, 0);
  context.drawImage(baseCanvas, 0, 0);
  context.drawImage(highlightCanvas, 0, 0);
}
