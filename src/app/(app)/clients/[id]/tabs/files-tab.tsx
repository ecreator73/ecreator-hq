"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileQuickCreate } from "@/components/clients/detail-quick-creates";
import { removeFileAction } from "@/app/(app)/clients/actions";
import { FILE_CATEGORIES } from "@/config/catalog";
import { Section, List, Row, formatBytes } from "../detail-ui";
import type { FileRecord } from "@/types/entities";

const KNOWN_KEYS = new Set(FILE_CATEGORIES.map((c) => c.key));

export function FilesTab({
  clientId,
  files,
}: {
  clientId: string;
  files: FileRecord[];
}) {
  return (
    <div className="space-y-5">
      <Section
        title="Dateien"
        description="Dateien werden als Link verknuepft (z.B. Google Drive). Kategorie Creative deckt Logos/Bilder/Videos ab."
        action={
          <FileQuickCreate
            clientId={clientId}
            label="Datei verknuepfen"
            variant="primary"
          />
        }
      >
        {files.length === 0 ? (
          <EmptyState
            title="Keine Dateien"
            description="Verknuepfe Verträge, Praesentationen, Reports oder Creatives."
          />
        ) : (
          <div className="space-y-5">
            {FILE_CATEGORIES.map((cat) => {
              const inCategory = files.filter((f) => {
                const key = f.category && KNOWN_KEYS.has(f.category) ? f.category : "other";
                return key === cat.key;
              });
              if (inCategory.length === 0) return null;
              return (
                <Section key={cat.key} title={cat.label}>
                  <List>
                    {inCategory.map((f) => (
                      <FileRow key={f.id} file={f} clientId={clientId} />
                    ))}
                  </List>
                </Section>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function FileRow({ file, clientId }: { file: FileRecord; clientId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      await removeFileAction(file.id, clientId);
      router.refresh();
    });
  }

  const size = formatBytes(file.size);

  return (
    <Row>
      <a
        href={file.file_url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1"
      >
        <span className="block truncate text-sm font-medium text-neutral-800 hover:text-brand-700">
          {file.filename}
        </span>
        {size ? (
          <span className="mt-0.5 block text-xs text-neutral-400">{size}</span>
        ) : null}
      </a>
      <Button
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={pending}
        aria-label="Datei entfernen"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </Row>
  );
}
