import { normalizeExerciseVisual } from "@/lib/training/visuals";
import type { Exercise, MuscleGroup, PlanType, TrainingEquipment } from "@/lib/training/types";

export const defaultEquipment: TrainingEquipment[] = ["bodyweight"];

const allPlanTypes: PlanType[] = ["starter", "normal", "low_motivation", "recovery", "progression", "deload", "comeback"];
const strengthPlanTypes: PlanType[] = ["starter", "normal", "progression", "comeback"];
const easyPlanTypes: PlanType[] = ["starter", "low_motivation", "deload", "comeback"];

export const exercisePool: Exercise[] = withVisuals([
  { id: "joint-mobility", name: "Gelenke mobilisieren", sets: 1, durationSec: 180, restSec: 0, muscleGroup: "mobility", difficulty: 1, equipment: ["bodyweight"], instructions: "Schultern, Huefte, Knie und Sprunggelenke ruhig und kontrolliert kreisen.", tags: allPlanTypes },
  { id: "march-in-place", name: "Locker marschieren", sets: 1, durationSec: 180, restSec: 0, muscleGroup: "legs", secondaryMuscles: ["calves"], difficulty: 1, equipment: ["bodyweight"], instructions: "Aufrecht bleiben, Arme aktiv mitnehmen und die Atmung ruhig halten.", tags: allPlanTypes },
  { id: "cat-cow", name: "Cat-Cow Mobility", sets: 1, durationSec: 120, restSec: 0, muscleGroup: "mobility", secondaryMuscles: ["back", "core"], difficulty: 1, equipment: ["bodyweight"], instructions: "Wirbelsaeule kontrolliert rund und lang bewegen.", tags: ["recovery", "low_motivation", "deload", "comeback"] },
  { id: "worlds-greatest-stretch", name: "World's Greatest Stretch", sets: 1, durationSec: 180, restSec: 0, muscleGroup: "mobility", secondaryMuscles: ["legs", "glutes", "back"], difficulty: 2, equipment: ["bodyweight"], instructions: "Ausfallschritt, Rotation und Hueftoeffnung ohne Zug erzwingen.", tags: ["normal", "progression", "recovery", "deload"] },
  { id: "incline-pushups", name: "Incline Push-ups", sets: 3, reps: "8-12", restSec: 65, muscleGroup: "chest", secondaryMuscles: ["triceps", "shoulders"], difficulty: 2, equipment: ["bodyweight"], instructions: "Haende erhoeht ablegen, Koerper gerade halten und sauber druecken.", tags: easyPlanTypes },
  { id: "pushups", name: "Push-ups", sets: 3, reps: "8-12", restSec: 75, muscleGroup: "chest", secondaryMuscles: ["triceps", "shoulders", "core"], difficulty: 3, equipment: ["bodyweight"], instructions: "Kontrolliert absenken, Spannung halten und ohne Schwung hochdruecken.", tags: strengthPlanTypes },
  { id: "tempo-pushups", name: "Tempo Push-ups", sets: 3, reps: "6-9", restSec: 85, muscleGroup: "chest", secondaryMuscles: ["triceps", "shoulders", "core"], difficulty: 4, equipment: ["bodyweight"], instructions: "Drei Sekunden absenken, kurz halten, sauber hochdruecken.", tags: ["progression"] },
  { id: "pike-pushups", name: "Pike Push-ups", sets: 3, reps: "5-8", restSec: 85, muscleGroup: "shoulders", secondaryMuscles: ["triceps"], difficulty: 4, equipment: ["bodyweight"], instructions: "Huefte hoch, Kopf kontrolliert Richtung Boden fuehren.", tags: ["normal", "progression"] },
  { id: "wall-angels", name: "Wall Angels", sets: 2, durationSec: 45, restSec: 30, muscleGroup: "shoulders", secondaryMuscles: ["back"], difficulty: 1, equipment: ["bodyweight"], instructions: "Rippen unten halten und Arme langsam an der Wand fuehren.", tags: ["recovery", "deload", "low_motivation", "comeback"] },
  { id: "squats", name: "Squats", sets: 3, reps: "12-16", restSec: 60, muscleGroup: "legs", secondaryMuscles: ["glutes", "calves"], difficulty: 2, equipment: ["bodyweight"], instructions: "Knie folgen den Zehen, Brust bleibt offen, Tiefe nur so weit sauber moeglich.", tags: allPlanTypes.filter((type) => type !== "recovery") },
  { id: "tempo-squats", name: "Tempo Squats", sets: 3, reps: "8-12", restSec: 75, muscleGroup: "legs", secondaryMuscles: ["glutes"], difficulty: 3, equipment: ["bodyweight"], instructions: "Drei Sekunden absenken und ohne Einfallen der Knie aufstehen.", tags: ["normal", "progression"] },
  { id: "reverse-lunges", name: "Reverse Lunges", sets: 3, reps: "8-10 je Seite", restSec: 70, muscleGroup: "legs", secondaryMuscles: ["glutes"], difficulty: 3, equipment: ["bodyweight"], instructions: "Rueckwaerts aussteigen, vorderen Fuss stabil halten, kontrolliert zurueck.", tags: ["normal", "progression"] },
  { id: "split-squat", name: "Split Squat", sets: 3, reps: "8 je Seite", restSec: 80, muscleGroup: "legs", secondaryMuscles: ["glutes"], difficulty: 4, equipment: ["bodyweight"], instructions: "Stand stabilisieren und langsam durch den vorderen Fuss arbeiten.", tags: ["progression"] },
  { id: "glute-bridge", name: "Glute Bridge", sets: 3, reps: "12-16", restSec: 45, muscleGroup: "glutes", secondaryMuscles: ["core"], difficulty: 2, equipment: ["bodyweight"], instructions: "Becken hochdruecken, oben kurz halten und Bauchspannung behalten.", tags: allPlanTypes },
  { id: "single-leg-glute-bridge", name: "Single-Leg Glute Bridge", sets: 2, reps: "8-10 je Seite", restSec: 65, muscleGroup: "glutes", secondaryMuscles: ["core"], difficulty: 4, equipment: ["bodyweight"], instructions: "Becken gerade halten und langsam arbeiten.", tags: ["progression"] },
  { id: "calf-raises", name: "Wadenheben", sets: 3, reps: "15-20", restSec: 40, muscleGroup: "calves", difficulty: 1, equipment: ["bodyweight"], instructions: "Langsam auf die Ballen druecken, oben kurz halten.", tags: allPlanTypes.filter((type) => type !== "recovery") },
  { id: "plank", name: "Plank", sets: 3, durationSec: 30, restSec: 45, muscleGroup: "core", secondaryMuscles: ["shoulders"], difficulty: 2, equipment: ["bodyweight"], instructions: "Lange Linie halten, Rippen runter und ruhig weiteratmen.", tags: allPlanTypes.filter((type) => type !== "recovery") },
  { id: "side-plank", name: "Side Plank", sets: 2, durationSec: 25, restSec: 45, muscleGroup: "core", secondaryMuscles: ["shoulders"], difficulty: 3, equipment: ["bodyweight"], instructions: "Huefte hochhalten, Schulter bleibt stabil ueber dem Ellbogen.", tags: ["normal", "progression"] },
  { id: "dead-bug", name: "Dead Bug", sets: 2, reps: "8 je Seite", restSec: 35, muscleGroup: "core", difficulty: 1, equipment: ["bodyweight"], instructions: "Ruecken ruhig am Boden, Arme und Beine langsam wechseln.", tags: ["starter", "low_motivation", "recovery", "deload", "comeback"] },
  { id: "hollow-hold", name: "Hollow Hold", sets: 3, durationSec: 20, restSec: 50, muscleGroup: "core", difficulty: 4, equipment: ["bodyweight"], instructions: "Unterer Ruecken bleibt kontrolliert, notfalls Knie anwinkeln.", tags: ["progression", "normal"] },
  { id: "superman-hold", name: "Superman Hold", sets: 2, durationSec: 25, restSec: 40, muscleGroup: "back", secondaryMuscles: ["glutes"], difficulty: 2, equipment: ["bodyweight"], instructions: "Nacken lang halten und Rueckenstrecker sanft aktivieren.", tags: ["starter", "normal", "low_motivation", "deload", "comeback"] },
  { id: "mountain-climbers", name: "Mountain Climbers", sets: 3, durationSec: 25, restSec: 50, muscleGroup: "core", secondaryMuscles: ["shoulders", "legs"], difficulty: 4, equipment: ["bodyweight"], instructions: "Stabile Stuetzposition, Knie rhythmisch nach vorne ziehen.", tags: ["progression", "normal"] },
  { id: "burpees-light", name: "Burpees light", sets: 2, reps: "5-7", restSec: 85, muscleGroup: "legs", secondaryMuscles: ["chest", "shoulders", "core"], difficulty: 4, equipment: ["bodyweight"], instructions: "Ohne Sprung, sauber in die Stuetzposition und zurueck.", tags: ["progression"] },
  { id: "pullups", name: "Pull-ups", sets: 3, reps: "3-6", restSec: 100, muscleGroup: "back", secondaryMuscles: ["biceps", "forearms"], difficulty: 5, equipment: ["pullup_bar"], instructions: "Schultern aktiv setzen, kontrolliert ziehen, keine Schwungwiederholungen.", tags: ["progression"] },
  { id: "negative-pullups", name: "Negative Pull-ups", sets: 3, reps: "3-5", restSec: 90, muscleGroup: "back", secondaryMuscles: ["biceps", "forearms"], difficulty: 4, equipment: ["pullup_bar"], instructions: "Oben starten und langsam ueber drei bis fuenf Sekunden ablassen.", tags: ["normal", "progression"] },
  { id: "dead-hang", name: "Dead Hang", sets: 2, durationSec: 20, restSec: 55, muscleGroup: "forearms", secondaryMuscles: ["back"], difficulty: 2, equipment: ["pullup_bar"], instructions: "Locker haengen, Griff nicht maximal erzwingen.", tags: ["normal", "recovery", "deload", "comeback"] },
  { id: "treadmill-walk", name: "Laufband Walk", sets: 1, durationSec: 420, restSec: 0, muscleGroup: "legs", secondaryMuscles: ["calves"], difficulty: 1, equipment: ["treadmill"], instructions: "Ruhiges Tempo mit leichter Steigung, du solltest sprechen koennen.", tags: ["recovery", "low_motivation", "deload", "comeback"] },
  { id: "treadmill-intervals", name: "Laufband Intervalle", sets: 5, durationSec: 45, restSec: 60, muscleGroup: "legs", secondaryMuscles: ["calves"], difficulty: 4, equipment: ["treadmill"], instructions: "Zuegig, aber kein Sprint: 45 Sekunden flott, 60 Sekunden locker.", tags: ["progression", "normal"] },
  { id: "hip-flexor-stretch", name: "Hueftbeuger Stretch", sets: 1, durationSec: 120, restSec: 0, muscleGroup: "mobility", secondaryMuscles: ["legs", "glutes"], difficulty: 1, equipment: ["bodyweight"], instructions: "Sanfter Ausfallschritt, Becken leicht aufrichten.", tags: allPlanTypes },
  { id: "childs-pose", name: "Child's Pose", sets: 1, durationSec: 120, restSec: 0, muscleGroup: "mobility", secondaryMuscles: ["back", "shoulders"], difficulty: 1, equipment: ["bodyweight"], instructions: "Ruhig atmen und Ruecken lang werden lassen.", tags: allPlanTypes },
  { id: "hamstring-breathing-stretch", name: "Hamstring Breathing Stretch", sets: 1, durationSec: 120, restSec: 0, muscleGroup: "mobility", secondaryMuscles: ["legs", "calves"], difficulty: 1, equipment: ["bodyweight"], instructions: "Leichten Zug halten und mit jeder Ausatmung entspannen.", tags: ["recovery", "deload", "low_motivation", "comeback", "normal"] },
]);

export function filterExercises(input: {
  equipment: TrainingEquipment[];
  planType: PlanType;
  maxDifficulty: number;
  recentMuscleGroups: MuscleGroup[];
  includeRecent?: boolean;
}) {
  const equipment = input.equipment.length ? input.equipment : defaultEquipment;
  const allowed = new Set<TrainingEquipment>(["bodyweight", ...equipment]);
  const recent = new Set(input.recentMuscleGroups);
  return exercisePool.filter((exercise) => {
    const hasEquipment = exercise.equipment.every((item) => allowed.has(item));
    const fitsPlan = !exercise.tags?.length || exercise.tags.includes(input.planType);
    const fitsDifficulty = exercise.difficulty <= input.maxDifficulty;
    const avoidsRecent = input.includeRecent || exercise.muscleGroup === "mobility" || !recent.has(exercise.muscleGroup);
    return hasEquipment && fitsPlan && fitsDifficulty && avoidsRecent;
  });
}

export function exerciseMuscles(exercise: Exercise): MuscleGroup[] {
  return [exercise.muscleGroup, ...(exercise.secondaryMuscles ?? [])].filter((muscle, index, array) => array.indexOf(muscle) === index);
}

function withVisuals(exercises: Exercise[]): Exercise[] {
  return exercises.map((exercise) => ({ ...exercise, visual: normalizeExerciseVisual(exercise.visual, exercise.name) }));
}
