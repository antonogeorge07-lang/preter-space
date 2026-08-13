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

/** Renders children only for signed-in users; otherwise sends them to /landing. */
export default function AuthGate({ children }) {
  const { isAuthenticated, isLoadingAuth, authError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) navigate("/landing", { replace: true });
  }, [isLoadingAuth, isAuthenticated, navigate]);

  if (isLoadingAuth) return <PreterLoader />;
  if (authError?.type === "user_not_registered") return <UserNotRegisteredError />;
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
