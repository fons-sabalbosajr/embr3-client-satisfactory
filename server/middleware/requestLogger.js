import { writeLog } from "../models/Log.js";

// Paths that should never be logged (avoid noise / recursion).
const SKIP_PATHS = [/^\/api\/admin\/logs/, /^\/api\/health/];

// Methods that represent state changes worth auditing.
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Express middleware that records an application log entry for every
 * mutating API request and for any error response. The entry is written
 * after the response finishes so the authenticated user (req.user, set by
 * authMiddleware during the route handler) is available.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    try {
      const path = (req.originalUrl || req.url || "").split("?")[0];
      if (!path.startsWith("/api")) return;
      if (SKIP_PATHS.some((re) => re.test(path))) return;

      const status = res.statusCode;
      const isError = status >= 400;

      // Only persist mutations and error responses to keep volume manageable.
      if (!MUTATING_METHODS.has(req.method) && !isError) return;

      const user = req.user || {};
      const level =
        status >= 500 ? "error" : status >= 400 ? "warn" : "info";

      writeLog({
        level,
        type: "request",
        method: req.method,
        path,
        statusCode: status,
        durationMs: Date.now() - start,
        message: `${req.method} ${path} → ${status}`,
        userId: user.id || user._id || null,
        userName: user.username || user.fullname || user.name || null,
        ip: req.ip,
        userAgent: req.headers["user-agent"] || null,
      });
    } catch {
      // Never throw from the logger.
    }
  });

  next();
}

export default requestLogger;
