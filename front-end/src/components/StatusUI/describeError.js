// Classifies any thrown value (axios error, Error, string) into a variant
// with a friendly title and message. Kept apart from StatusUI.jsx so that file
// only exports components (React fast refresh).
import {
  ReloadOutlined,
  WifiOutlined,
  CloudServerOutlined,
  LockOutlined,
  FileSearchOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

// ── Error classification ──────────────────────────────────────────────────
export const VARIANTS = {
  offline: {
    icon: WifiOutlined,
    tone: "warn",
    title: "You're offline",
    message: "We couldn't reach the server. Check your internet connection, then try again.",
  },
  network: {
    icon: CloudServerOutlined,
    tone: "warn",
    title: "Can't reach the server",
    message: "The server didn't respond. It may be restarting or your connection may be unstable. Please try again in a moment.",
  },
  timeout: {
    icon: ClockCircleOutlined,
    tone: "warn",
    title: "This is taking too long",
    message: "The request timed out. The server may be busy — please try again.",
  },
  unauthorized: {
    icon: LockOutlined,
    tone: "info",
    title: "Your session has ended",
    message: "Please sign in again to continue.",
  },
  forbidden: {
    icon: LockOutlined,
    tone: "info",
    title: "You don't have access",
    message: "Your account doesn't have permission to view this. Ask an administrator if you need access.",
  },
  notFound: {
    icon: FileSearchOutlined,
    tone: "info",
    title: "Page not found",
    message: "The page you're looking for doesn't exist or has moved.",
  },
  rateLimited: {
    icon: ClockCircleOutlined,
    tone: "warn",
    title: "Too many requests",
    message: "The server is receiving a lot of requests right now. Please wait a few seconds and try again.",
  },
  server: {
    icon: CloudServerOutlined,
    tone: "error",
    title: "Something went wrong on our side",
    message: "The server ran into a problem. Please try again. If it keeps happening, contact the system administrator.",
  },
  maintenance: {
    icon: ToolOutlined,
    tone: "warn",
    title: "Scheduled maintenance",
    message: "The admin portal is being updated. Please try again later — the client survey is still available.",
  },
  update: {
    icon: ReloadOutlined,
    tone: "info",
    title: "A new version is available",
    message: "The system was updated while this page was open. Reload to get the latest version.",
  },
  crash: {
    icon: WarningOutlined,
    tone: "error",
    title: "This page stopped working",
    message: "An unexpected error occurred while showing this page. Reloading usually fixes it.",
  },
  generic: {
    icon: ExclamationCircleOutlined,
    tone: "error",
    title: "Something went wrong",
    message: "Please try again.",
  },
};

const isChunkError = (err) =>
  /Failed to fetch dynamically imported module|Loading chunk [\w-]+ failed|Importing a module script failed|error loading dynamically imported module/i.test(
    String(err?.message || err || "")
  );

/** Turn any thrown value (axios error, Error, string) into display text. */
export function describeError(err, fallbackVariant = "generic") {
  if (!err) return { variant: fallbackVariant, ...VARIANTS[fallbackVariant] };
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
  let variant = fallbackVariant;

  if (isChunkError(err)) variant = "update";
  else if (typeof navigator !== "undefined" && navigator.onLine === false) variant = "offline";
  else if (err?.code === "ECONNABORTED" || /timeout/i.test(String(err?.message || ""))) variant = "timeout";
  else if (err?.isAxiosError && !err.response) variant = "network";
  else if (status === 401) variant = "unauthorized";
  else if (status === 403) variant = "forbidden";
  else if (status === 404) variant = "notFound";
  else if (status === 429) variant = "rateLimited";
  else if (status === 503) variant = "maintenance";
  else if (status >= 500) variant = "server";

  const base = VARIANTS[variant] || VARIANTS.generic;
  // A server message is shown for client-side (4xx) problems where it is
  // usually specific and safe ("Username already exists"); 5xx messages stay
  // generic so stack-like text never reaches the client.
  const message = serverMsg && status && status < 500 && variant !== "notFound" ? serverMsg : base.message;
  const detail = [status ? `HTTP ${status}` : null, err?.code || null, err?.message || (typeof err === "string" ? err : null)]
    .filter(Boolean)
    .join(" · ");
  return { variant, ...base, message, detail, status };
}
