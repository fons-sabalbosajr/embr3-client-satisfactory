import User from "../models/User.js";

/** The single definition of a developer account: position "Developer". */
export const isDeveloperUser = (user) =>
  String(user?.position || "").trim().toLowerCase() === "developer";

/**
 * Developer-only routes: system setup and maintenance (data configuration,
 * VERA settings, backups, app logs, accounts management, danger zone).
 * No permission flag or privilege grants access — only the Developer
 * position, which is set deliberately rather than toggled in the UI.
 */
export function requireDeveloper(req, res, next) {
  (async () => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await User.findById(req.user.id, "position");
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      if (isDeveloperUser(user)) return next();
      return res.status(403).json({ message: "Forbidden - developer access only" });
    } catch (err) {
      console.error("Developer check error", err);
      res.status(500).json({ message: "Server error" });
    }
  })();
}

export function requirePermission(permissionKey) {
  return async function (req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await User.findById(req.user.id);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const perms = user.permissions || {};
      if (perms[permissionKey]) return next();

      // Allow admins and Developers by default
      if (user.privilege === "admin" || user.position === "Developer") return next();

      return res.status(403).json({ message: "Forbidden - insufficient permissions" });
    } catch (err) {
      console.error("Permission check error", err);
      res.status(500).json({ message: "Server error" });
    }
  };
}
