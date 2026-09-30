import { useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

export function PreterLoader() {
  return (
    <div
      className="fixed inset-0 flex select-none items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <h1
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "var(--primary)" }}
        className="animate-pulse text-2xl font-semibold uppercase tracking-widest opacity-50"
      >
        Preter
      </h1>
    </div>
  );
}

/** Shown when the app cannot reach Preter, instead of a raw fetch error. */
export function ConnectionError({ message, onRetry }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-sm text-center">
        <h1 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
          Can't connect right now
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {message || "We couldn't reach Preter. Check your connection and try again."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 w-full rounded-2xl py-3 text-sm font-semibold"
          style={{ background: "var(--primary)", color: "var(--paper)" }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}

/** Renders children only for signed-in users; otherwise sends them to /landing. */
export default function AuthGate({ children }) {
  const { isAuthenticated, isLoadingAuth, authError, retryAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !authError) {
      console.log("[dbg] gate redirect"); navigate("/landing", { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated, authError, navigate]);

  if (isLoadingAuth) return <PreterLoader />;
  if (authError?.type === "user_not_registered") return <UserNotRegisteredError />;
  if (authError?.type === "network") {
    return <ConnectionError message={authError.message} onRetry={retryAuth} />;
  }
  if (!isAuthenticated) return <PreterLoader />;

  return children;
}

/** Inverse gate: public auth screens redirect signed-in users home. */
export function GuestGate({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) navigate("/", { replace: true });
  }, [isLoadingAuth, isAuthenticated, navigate]);

  if (isLoadingAuth) return <PreterLoader />;
  return children;
}
