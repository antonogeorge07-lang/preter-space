import { useState, type ReactNode } from "react";
import {
  ConvexProvider,
  ConvexReactClient,
  useQuery as useConvexQuery,
  useMutation as useConvexMutation,
  useAction as useConvexAction,
} from "convex/react";
import { makeFunctionReference } from "convex/server";

export const CONVEX_URL = import.meta.env["VITE_CONVEX_URL"] as string | undefined;

let client: ConvexReactClient | null = null;

/** Lazily created so SSR never opens a socket at module-evaluation time. */
export function getConvexClient(): ConvexReactClient | null {
  if (!CONVEX_URL) return null;
  if (!client) {
    client = new ConvexReactClient(CONVEX_URL, { unsavedChangesWarning: false });
  }
  return client;
}

/**
 * Reference a deployed Convex function by name, e.g. `fn("messages:list")`.
 * Use this until the project's `convex/` folder (and its generated `api`
 * object) lives in this repo.
 */
export const fn = {
  query: <Args, Return>(name: string) => makeFunctionReference<"query", Args, Return>(name),
  mutation: <Args, Return>(name: string) => makeFunctionReference<"mutation", Args, Return>(name),
  action: <Args, Return>(name: string) => makeFunctionReference<"action", Args, Return>(name),
};

export { useConvexQuery, useConvexMutation, useConvexAction };

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => getConvexClient());
  if (!convex) return <>{children}</>;
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
