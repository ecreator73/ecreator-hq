import type { Scene } from "@/lib/scenes";

/** Szenen-Skript als Tabelle: Nr., Bild, Sprechertext. */
export function ScenesTable({ scenes }: { scenes: Scene[] }) {
  return (
    <table className="mt-1 w-full text-sm">
      <thead className="text-left text-[11px] uppercase tracking-wide text-neutral-400">
        <tr>
          <th className="w-10 py-1 font-medium">Nr.</th>
          <th className="w-2/5 py-1 font-medium">Bild</th>
          <th className="py-1 font-medium">Sprechertext</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100 align-top">
        {scenes.map((x) => (
          <tr key={x.scene}>
            <td className="py-1.5 tabular-nums text-neutral-400">{x.scene}</td>
            <td className="whitespace-pre-line py-1.5 pr-3 text-neutral-600">{x.image}</td>
            <td className="whitespace-pre-line py-1.5 text-neutral-800">{x.speech}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
