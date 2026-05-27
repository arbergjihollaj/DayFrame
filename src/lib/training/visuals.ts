import type { ExerciseVisual } from "@/lib/training/types";

export const exerciseVisualSources = ["local", "exercisedb", "wger", "placeholder"] as const;
export const exerciseVisualTypes = ["image", "gif", "video", "placeholder", "none"] as const;

export function placeholderVisual(alt: string): ExerciseVisual {
  return { type: "placeholder", source: "placeholder", alt };
}

export function normalizeExerciseVisual(visual: ExerciseVisual | undefined, alt = "Uebung"): ExerciseVisual {
  if (!visual || visual.type === "none") return placeholderVisual(alt);
  if (visual.type === "placeholder") return { ...placeholderVisual(visual.alt ?? alt), externalId: visual.externalId };
  if (!visual.url) return placeholderVisual(visual.alt ?? alt);
  return {
    type: visual.type,
    url: visual.url,
    source: visual.source,
    externalId: visual.externalId,
    alt: visual.alt ?? alt,
  };
}

export function hasExerciseVisualUrl(visual: ExerciseVisual | undefined): visual is ExerciseVisual & { url: string } {
  return Boolean(visual?.url && visual.type !== "placeholder" && visual.type !== "none");
}
