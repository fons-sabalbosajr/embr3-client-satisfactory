import User from "../models/User.js";

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
