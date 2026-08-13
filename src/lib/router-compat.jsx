/**
 * Minimal react-router-dom compatibility layer on top of TanStack Router,
 * so ported pages/components keep working unchanged.
 */
import { useRouter, useLocation as useTanstackLocation, useParams as useTanstackParams } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to, options = {}) => {
      if (typeof to === "number") {
        router.history.go(to);
        return;
      }
      router.navigate({ to, replace: !!options.replace });
    },
    [router],
  );
}

export function useParams() {
  return useTanstackParams({ strict: false });
}

export function useLocation() {
  const loc = useTanstackLocation();
  return { pathname: loc.pathname, search: loc.searchStr, hash: loc.hash, state: loc.state };
}

export function useSearchParams() {
  const loc = useTanstackLocation();
  const router = useRouter();
  const params = useMemo(() => new URLSearchParams(loc.searchStr || ""), [loc.searchStr]);
  const setParams = useCallback(
    (next) => {
      const sp = next instanceof URLSearchParams ? next : new URLSearchParams(next);
      router.navigate({ to: loc.pathname, search: Object.fromEntries(sp.entries()) });
    },
    [router, loc.pathname],
  );
  return [params, setParams];
}

export function Link({ to, replace, children, ...rest }) {
  const navigate = useNavigate();
  return (
    <a
      href={typeof to === "string" ? to : "#"}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to, { replace });
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
