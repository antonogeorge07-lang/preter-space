import { useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ConvexProviderWithAuth,
  ConvexReactClient,
  useQuery as useConvexQuery,
  useMutation as useConvexMutation,
  useAction as useConvexAction,
} from "convex/react";
import { makeFunctionReference } from "convex/server";

// Public deployment URL; fallback keeps chat working if the env file is regenerated.
export const CONVEX_URL =
  (import.meta.env["VITE_CONVEX_URL"] as string | undefined) ||
  "https://good-impala-784.eu-west-1.convex.cloud";

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
  query: <Args extends Record<string, unknown>, Return>(name: string) =>
    makeFunctionReference<"query", Args, Return>(name),
  mutation: <Args extends Record<string, unknown>, Return>(name: string) =>
    makeFunctionReference<"mutation", Args, Return>(name),
  action: <Args extends Record<string, unknown>, Return>(name: string) =>
    makeFunctionReference<"action", Args, Return>(name),
};

export { useConvexQuery, useConvexMutation, useConvexAction };

function useSupabaseConvexAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        setIsAuthenticated(!error && !!data.session?.access_token);
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void refresh();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setIsAuthenticated(event !== "SIGNED_OUT" && !!session?.access_token);
      setIsLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        if (forceRefreshToken) {
          const { data, error } = await supabase.auth.refreshSession();
          return error ? null : (data.session?.access_token ?? null);
        }

        const { data, error } = await supabase.auth.getSession();
        return error ? null : (data.session?.access_token ?? null);
      } catch {
        return null;
      }
    },
    [],
  );

  return { isLoading, isAuthenticated, fetchAccessToken };
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => getConvexClient());

  if (!convex) return <>{children}</>;

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useSupabaseConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
