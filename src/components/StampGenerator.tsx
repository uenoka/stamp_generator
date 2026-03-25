"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";

import { StampCanvas } from "@/components/StampCanvas";
import { ANGLES, DEFAULT_STAMP_TEXT, PREVIEW_SIZE } from "@/lib/stamp/constants";
import { resolveShape } from "@/lib/stamp/layout";
import { analyzeText } from "@/lib/stamp/text";
import type { StampAngle, StampShape } from "@/lib/stamp/types";

export function StampGenerator() {
  const [text, setText] = useState(DEFAULT_STAMP_TEXT);
  const [shape, setShape] = useState<StampShape>("circle");
  const [angle, setAngle] = useState<StampAngle>(0);
  const [downloadError, setDownloadError] = useState("");
  const deferredText = useDeferredValue(text);
  const profile = analyzeText(deferredText);
  const resolvedShape = resolveShape(profile, shape);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shape === "circle" && resolvedShape === "square") {
      setShape("square");
    }
  }, [resolvedShape, shape]);

  const options = {
    text: profile.sanitized,
    shape: resolvedShape,
    angle,
    size: PREVIEW_SIZE,
    texture: "mvp" as const,
  };

  async function handleDownload() {
    const canvas = previewRef.current?.querySelector("canvas");

    if (!canvas) {
      setDownloadError("プレビューの生成に失敗しました。");
      return;
    }

    setDownloadError("");

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/png");
    });

    if (!blob) {
      setDownloadError("PNG の書き出しに失敗しました。");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${profile.sanitized || "stamp"}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Frontend-only Stamp Generator</p>
        <h1>遊び心のあるハンコを、透過PNGでそのまま保存</h1>
        <p className="hero-copy">
          Slack 絵文字向けを前提に、読みやすさを優先した朱肉風のハンコ画像をブラウザだけで生成します。
        </p>
      </section>

      <section className="workspace">
        <div className="panel controls">
          <label className="field">
            <span>文字</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={16}
              rows={3}
              placeholder="例: 承認 / OKです / 既読"
            />
          </label>

          <div className="field-inline">
            <span>文字数</span>
            <strong>
              {profile.graphemes.length} 文字 / 推奨 8 文字以内
            </strong>
          </div>

          <fieldset className="field-group">
            <legend>枠形状</legend>
            <div className="segmented">
              <button
                type="button"
                className={shape === "circle" ? "active" : ""}
                onClick={() => setShape("circle")}
                disabled={!profile.isCircleEligible}
              >
                円
              </button>
              <button
                type="button"
                className={shape === "square" ? "active" : ""}
                onClick={() => setShape("square")}
              >
                四角
              </button>
            </div>
            {!profile.isCircleEligible ? (
              <p className="hint">文字量が多いため、円形は無効化しています。</p>
            ) : (
              <p className="hint">円形は短文向け、長文は四角形で複数行にします。</p>
            )}
          </fieldset>

          <fieldset className="field-group">
            <legend>お辞儀角度</legend>
            <div className="segmented">
              {ANGLES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={angle === value ? "active" : ""}
                  onClick={() => setAngle(value)}
                >
                  {value}°
                </button>
              ))}
            </div>
          </fieldset>

          <div className="message-stack">
            {profile.isEmpty ? <p className="warning">文字を入力してください。</p> : null}
            {profile.warnings.map((warning) => (
              <p key={warning} className="hint">
                {warning}
              </p>
            ))}
            {downloadError ? <p className="warning">{downloadError}</p> : null}
          </div>

          <button
            type="button"
            className="download-button"
            onClick={handleDownload}
            disabled={profile.isEmpty}
          >
            透過PNGをダウンロード
          </button>
        </div>

        <div className="panel preview-panel" ref={previewRef}>
          <div className="preview-meta">
            <span>Preview</span>
            <strong>
              {resolvedShape === "circle" ? "円形" : "四角形"} / {angle}°
            </strong>
          </div>
          <div className="preview-stage">
            <div className="preview-grid" />
            <StampCanvas options={options} profile={profile} />
          </div>
          <p className="hint">出力サイズは {PREVIEW_SIZE} x {PREVIEW_SIZE} の透過PNGです。</p>
        </div>
      </section>
    </main>
  );
}
