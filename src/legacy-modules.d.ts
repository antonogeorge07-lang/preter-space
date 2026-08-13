/**
 * Type shims for the ported JavaScript modules (JSX/JS) that TypeScript route
 * files import. The ported app is plain JS and is not typechecked.
 */
declare module "@/lib/AuthContext" {
  export const AuthProvider: (props: { children?: unknown }) => any;
  export function useAuth(): any;
}

declare module "@/lib/db" {
  export const db: any;
  const _default: any;
  export default _default;
}

declare module "@/lib/router-compat" {
  export function useNavigate(): (to: string | number, options?: { replace?: boolean }) => void;
  export function useParams(): Record<string, string | undefined>;
  export function useLocation(): { pathname: string; search: string; hash: string; state: unknown };
  export function useSearchParams(): [URLSearchParams, (next: any) => void];
  export const Link: (props: any) => any;
}

declare module "@/lib/PageNotFound" {
  const PageNotFound: (props?: any) => any;
  export default PageNotFound;
}

declare module "@/components/AuthGate" {
  const AuthGate: (props: { children?: unknown }) => any;
  export default AuthGate;
  export const GuestGate: (props: { children?: unknown }) => any;
  export const PreterLoader: () => any;
}

declare module "@/components/ui/toaster" {
  export const Toaster: () => any;
}

declare module "@/pages/Forge" {
  const Forge: () => any;
  export default Forge;
}
declare module "@/pages/Landing" {
  const Landing: () => any;
  export default Landing;
}
declare module "@/pages/Login" {
  const Login: () => any;
  export default Login;
}
declare module "@/pages/Register" {
  const Register: () => any;
  export default Register;
}
declare module "@/pages/ForgotPassword" {
  const ForgotPassword: () => any;
  export default ForgotPassword;
}
declare module "@/pages/ResetPassword" {
  const ResetPassword: () => any;
  export default ResetPassword;
}
declare module "@/pages/Legal" {
  const Legal: () => any;
  export default Legal;
}
declare module "@/pages/JoinConversation" {
  const JoinConversation: () => any;
  export default JoinConversation;
}
