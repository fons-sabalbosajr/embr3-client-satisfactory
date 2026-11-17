// The admin writes its light/dark mode to <body data-theme="…">. VERA marks
// drawn on a canvas need to know it (their colours are set in JS, not CSS),
// so this hook follows that attribute.
import { useEffect, useState } from "react";

const read = () =>
  typeof document !== "undefined" && document.body?.getAttribute("data-theme") === "dark" ? "dark" : "light";

export default function useBodyTheme() {
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return undefined;
    const obs = new MutationObserver(() => setTheme(read()));
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}
