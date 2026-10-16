import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { router } from "./router";

const queryClient = new QueryClient({
  // Queries hit local IPC, not a network. A rejection is a deterministic
  // handler error, so retrying only delays showing it.
  defaultOptions: { queries: { retry: false } },
});
const container = document.getElementById("root");

if (container === null) {
  throw new Error("Missing #root element in index.html");
}

createRoot(container).render(
  <StrictMode>
    {/* Query sits outside the router: routes come and go, the cache does not. */}
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
