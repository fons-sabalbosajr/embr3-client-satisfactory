import express from "express";

const router = express.Router();

// Expose only the config values that the frontend needs at runtime.
// Note: Values used in the browser are inherently public.
router.get("/", (req, res) => {
  try {
    res.json({
      // Keys used by frontend-only crypto (not secure, just obfuscation)
      menuSecretKey: process.env.MENU_SECRET_KEY || "",
      secretKey: process.env.SECRET_KEY || "",
      colorSchemeSecret: process.env.COLOR_SCHEME_SECRET || "",
      emailJsPublicKey: process.env.EMAILJS_PUBLIC_KEY || "",

      // Helpful hints for client
      frontendBasePath: process.env.FRONTEND_BASE_PATH || "/",
    });
  } catch (err) {
    console.error("Error while handling /api/config:", err);
    res.status(500).json({ error: "Failed to read runtime config" });
  }
});

export default router;
