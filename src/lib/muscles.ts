import type { ExtendedBodyPart, Slug } from "@mjcdev/react-body-highlighter";

export const fixedMuscleGroups = ["Brust", "Rücken", "Schultern", "Bizeps", "Trizeps", "Bauch", "Beine", "Gesäß", "Waden", "Unterarme"] as const;

export type FixedMuscleGroup = (typeof fixedMuscleGroups)[number];

export const muscleMap: Record<FixedMuscleGroup, Slug[]> = {
  Brust: ["chest"],
  Rücken: ["upper-back", "lower-back"],
  Schultern: ["deltoids", "trapezius"],
  Bizeps: ["biceps"],
  Trizeps: ["triceps"],
  Bauch: ["abs", "obliques"],
  Beine: ["quadriceps", "hamstring", "adductors"],
  Gesäß: ["gluteal"],
  Waden: ["calves"],
  Unterarme: ["forearm"],
};

const muscleAliases: Record<string, FixedMuscleGroup> = {
  abs: "Bauch",
  abdomen: "Bauch",
  abdominals: "Bauch",
  arme: "Bizeps",
  armbeuger: "Bizeps",
  arms: "Bizeps",
  bauch: "Bauch",
  bauchmuskeln: "Bauch",
  biceps: "Bizeps",
  bizeps: "Bizeps",
  brust: "Brust",
  brustmuskeln: "Brust",
  calves: "Waden",
  chest: "Brust",
  core: "Bauch",
  deltoids: "Schultern",
  forearm: "Unterarme",
  forearms: "Unterarme",
  gesaess: "Gesäß",
  gesäß: "Gesäß",
  glutes: "Gesäß",
  gluteal: "Gesäß",
  hamstring: "Beine",
  hamstrings: "Beine",
  lowerback: "Rücken",
  "lower-back": "Rücken",
  oberarme: "Bizeps",
  quads: "Beine",
  quadriceps: "Beine",
  ruecken: "Rücken",
  "rücken": "Rücken",
  schultern: "Schultern",
  shoulders: "Schultern",
  triceps: "Trizeps",
  trapezius: "Schultern",
  trizeps: "Trizeps",
  unterarme: "Unterarme",
  upperback: "Rücken",
  "upper-back": "Rücken",
  waden: "Waden",
};

export function normalizeMuscleName(input: string): FixedMuscleGroup | null {
  const normalized = input
    .trim()
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[\s_]+/g, "-");
  return muscleAliases[normalized] ?? muscleAliases[normalized.replaceAll("-", "")] ?? null;
}

export function normalizeMuscleGroups(inputs: string[]): FixedMuscleGroup[] {
  const normalized = new Set<FixedMuscleGroup>();
  inputs.forEach((input) => {
    const muscle = normalizeMuscleName(input);
    if (muscle) normalized.add(muscle);
  });
  return fixedMuscleGroups.filter((muscle) => normalized.has(muscle));
}

export function muscleGroupsToBodyData(inputs: string[]): ExtendedBodyPart[] {
  const slugs = new Set<Slug>();
  normalizeMuscleGroups(inputs).forEach((muscle) => {
    muscleMap[muscle].forEach((slug) => slugs.add(slug));
  });
  return Array.from(slugs).map((slug) => ({ slug, intensity: 1 }));
}
