"use client";

import { useEffect, useRef } from "react";

import { PREVIEW_SIZE } from "@/lib/stamp/constants";
import { renderStamp } from "@/lib/stamp/render";
import type { StampOptions, TextProfile } from "@/lib/stamp/types";

interface StampCanvasProps {
  options: StampOptions;
  profile: TextProfile;
}

export function StampCanvas({ options, profile }: StampCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || profile.isEmpty) {
      return;
    }

    renderStamp(canvasRef.current, profile, options);
  }, [options, profile]);

  return (
    <canvas
      ref={canvasRef}
      width={PREVIEW_SIZE}
      height={PREVIEW_SIZE}
      aria-label="ハンコプレビュー"
    />
  );
}
