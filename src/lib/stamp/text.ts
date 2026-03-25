import {
  CIRCLE_WEIGHT_LIMIT,
  MAX_INPUT_LENGTH,
  MAX_WEIGHTED_LENGTH,
} from "@/lib/stamp/constants";
import type { TextKind, TextProfile } from "@/lib/stamp/types";

const unsupportedPattern = /[\u0000-\u001f]/g;

function isAsciiAlphaNumeric(char: string) {
  return /^[A-Za-z0-9]$/.test(char);
}

function isHalfWidthSymbol(char: string) {
  return /^[ -~]$/.test(char) && !isAsciiAlphaNumeric(char);
}

function getCharUnit(char: string) {
  if (isAsciiAlphaNumeric(char)) {
    return 0.58;
  }

  if (isHalfWidthSymbol(char)) {
    return 0.72;
  }

  return 1;
}

function detectTextKind(graphemes: string[]): TextKind {
  const hasJapanese = graphemes.some((char) => /[^\u0020-\u007e]/.test(char));
  const hasLatin = graphemes.some((char) => /[\u0020-\u007e]/.test(char));

  if (hasJapanese && hasLatin) {
    return "mixed";
  }

  return hasJapanese ? "jp" : "latin";
}

export function analyzeText(rawText: string): TextProfile {
  const sanitized = rawText.replace(unsupportedPattern, "").trim();
  const graphemes = Array.from(sanitized);
  const weightedLength = graphemes.reduce((sum, char) => sum + getCharUnit(char), 0);
  const warnings: string[] = [];

  if (graphemes.length > MAX_INPUT_LENGTH) {
    warnings.push(`文字数は${MAX_INPUT_LENGTH}文字以内を推奨します。`);
  }

  if (weightedLength > MAX_WEIGHTED_LENGTH) {
    warnings.push("文字数が多いため、四角形に固定して3行レイアウトを優先します。");
  }

  if (/[^\p{L}\p{N}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s\-_.!？?]/u.test(sanitized)) {
    warnings.push("一部の記号や結合文字は環境依存で見た目がぶれる場合があります。");
  }

  return {
    sanitized,
    graphemes,
    weightedLength,
    textKind: detectTextKind(graphemes),
    isEmpty: sanitized.length === 0,
    isTooLong: graphemes.length > MAX_INPUT_LENGTH || weightedLength > MAX_WEIGHTED_LENGTH,
    isCircleEligible: weightedLength <= CIRCLE_WEIGHT_LIMIT,
    warnings,
  };
}

export function getUnitsForText(text: string) {
  return Array.from(text).reduce((sum, char) => sum + getCharUnit(char), 0);
}

export function pickFontFamily(textKind: TextKind) {
  if (textKind === "latin") {
    return "\"Iowan Old Style\", Georgia, \"Times New Roman\", serif";
  }

  return "\"Hiragino Mincho ProN\", \"Yu Mincho\", \"Noto Serif JP\", \"MS PMincho\", serif";
}
