import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appInfoQuery } from "@/lib/queries";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

export function App() {
  const queryClient = useQueryClient();
  const info = useQuery(appInfoQuery);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-10">
      <header>
        <h1 className="text-2xl font-semibold">Michigo</h1>
        <p className="text-muted-foreground text-sm">Know what you don&apos;t know</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Runtime</CardTitle>
          <CardDescription>Reported by the main process over IPC.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {info.isPending ? <p className="text-muted-foreground text-sm">Loading…</p> : null}
          {info.isError ? <p className="text-destructive text-sm">{info.error.message}</p> : null}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>Shared packages loaded by the main process.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {info.data?.modules.map((module) => (
              <li key={module.name} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-mono">{module.name}</span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono">{module.version}</span>
                  <Badge variant="secondary">{module.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="self-start"
        disabled={info.isFetching}
        onClick={() => {
          void queryClient.invalidateQueries({ queryKey: appInfoQuery.queryKey });
        }}
      >
        <RefreshCw className={info.isFetching ? "animate-spin" : undefined} />
        Refresh
      </Button>
    </main>
  );
}
