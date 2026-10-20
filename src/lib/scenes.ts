/** Szenen-Skript wie im Kunden-CRM: {"version":1,"scenes":[{scene,image,speech}]}. */
export type Scene = { scene: string; image: string; speech: string };

export function parseScenes(script: string | null | undefined): Scene[] | null {
  if (!script || !script.trim().startsWith("{")) return null;
  try {
    const j = JSON.parse(script) as { scenes?: Array<Partial<Scene>> };
    if (!Array.isArray(j.scenes)) return null;
    return j.scenes.map((x, i) => ({ scene: String(x.scene ?? String(i + 1).padStart(2, "0")), image: String(x.image ?? ""), speech: String(x.speech ?? "") }));
  } catch {
    return null;
  }
}

export const serializeScenes = (scenes: Scene[]) =>
  JSON.stringify({ version: 1, scenes: scenes.filter((x) => x.image.trim() || x.speech.trim()).map((x, i) => ({ ...x, scene: String(i + 1).padStart(2, "0") })) });
