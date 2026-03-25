import { FRAME_PADDING, PREVIEW_SIZE, STAMP_BODY_SIZE } from "@/lib/stamp/constants";
import type {
  StampLayout,
  StampLayoutLine,
  StampOptions,
  TextProfile,
} from "@/lib/stamp/types";
import { getUnitsForText } from "@/lib/stamp/text";

function splitIntoBalancedLines(text: string, rows: number): StampLayoutLine[] {
  if (rows <= 1) {
    return [{ text, units: getUnitsForText(text) }];
  }

  const graphemes = Array.from(text);
  const totalUnits = getUnitsForText(text);
  const target = totalUnits / rows;
  const lines: StampLayoutLine[] = [];
  let current = "";
  let currentUnits = 0;

  graphemes.forEach((char, index) => {
    const charUnits = getUnitsForText(char);
    const remainingChars = graphemes.length - index - 1;
    const remainingLines = rows - lines.length - 1;
    const shouldBreak =
      current.length > 0 &&
      currentUnits + charUnits > target &&
      remainingChars >= remainingLines;

    if (shouldBreak) {
      lines.push({ text: current, units: currentUnits });
      current = char;
      currentUnits = charUnits;
      return;
    }

    current += char;
    currentUnits += charUnits;
  });

  if (current) {
    lines.push({ text: current, units: currentUnits });
  }

  while (lines.length < rows) {
    lines.push({ text: "", units: 0 });
  }

  return lines;
}

function pickSquareRows(profile: TextProfile) {
  if (profile.weightedLength <= 4.3) {
    return 1;
  }

  if (profile.weightedLength <= 7.3) {
    return 2;
  }

  return 3;
}

function pickCircleRows(profile: TextProfile) {
  if (profile.weightedLength <= 2.4) {
    return 1;
  }

  if (profile.weightedLength <= 4.4) {
    return 2;
  }

  return 3;
}

export function resolveShape(profile: TextProfile, requestedShape: StampOptions["shape"]) {
  if (requestedShape === "circle" && !profile.isCircleEligible) {
    return "square";
  }

  return requestedShape;
}

export function createStampLayout(profile: TextProfile, shape: StampOptions["shape"]): StampLayout {
  const rows = shape === "circle" ? pickCircleRows(profile) : pickSquareRows(profile);
  const lines = splitIntoBalancedLines(profile.sanitized, rows).filter((line) => line.text.length > 0);
  const innerSize = shape === "circle" ? STAMP_BODY_SIZE * 0.62 : STAMP_BODY_SIZE * 0.7;
  const lineGap = rows === 1 ? 0 : innerSize * 0.1;
  const frameInset = FRAME_PADDING + (shape === "circle" ? 8 : 0);
  const lineHeight = (innerSize - lineGap * (lines.length - 1)) / Math.max(lines.length, 1);
  const widestUnits = Math.max(...lines.map((line) => Math.max(line.units, 1)));
  const fontSize = Math.min(lineHeight * 0.82, (innerSize / widestUnits) * 0.9);
  const strokeWidth = shape === "circle" ? 11 : 12;

  return {
    lines,
    fontSize,
    lineGap,
    strokeWidth,
    innerSize,
    frameInset,
  };
}

export function getStampBounds() {
  const center = PREVIEW_SIZE / 2;

  return {
    center,
    bodySize: STAMP_BODY_SIZE,
  };
}
