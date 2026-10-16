import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appInfoQuery } from "@/lib/queries";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const info = useQuery(appInfoQuery);

  return (
    <>
      <PageHeader title="Settings" description="Reported by the main process over IPC.">
        <Button
          variant="outline"
          disabled={info.isFetching}
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: appInfoQuery.queryKey });
          }}
        >
          <RefreshCw className={info.isFetching ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </PageHeader>

      <div className="flex max-w-2xl flex-col gap-4 px-8 pb-8">
        <section className="surface flex flex-col gap-2 p-4">
          <h2 className="font-heading text-base font-medium">Runtime</h2>
          {info.isPending ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {info.isError ? <p className="text-sm text-destructive">{info.error.message}</p> : null}
          {info.data === undefined ? null : (
            <>
              <DetailRow label="app" value={`${info.data.app} ${info.data.version}`} />
              <DetailRow label="node" value={info.data.node} />
              <DetailRow label="platform" value={info.data.platform} />
              {info.data.electron === undefined ? null : (
                <DetailRow label="electron" value={info.data.electron} />
              )}
            </>
          )}
        </section>

        <section className="surface flex flex-col gap-2 p-4">
          <h2 className="font-heading text-base font-medium">Modules</h2>
          <p className="text-sm text-muted-foreground">
            Shared packages loaded by the main process.
          </p>
          <ul className="flex flex-col gap-2">
            {info.data?.modules.map((module) => (
              <li key={module.name} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-mono">{module.name}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-muted-foreground">{module.version}</span>
                  <Badge variant="muted">{module.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
