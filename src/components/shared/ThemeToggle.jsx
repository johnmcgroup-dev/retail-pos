import React, { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTheme, setTheme } from "@/lib/theme";

/** Switches between the dark and light theme and remembers the choice. */
export default function ThemeToggle({ className = "" }) {
  const [theme, setLocalTheme] = useState(getTheme());
  const isDark = theme !== "light";

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    setLocalTheme(next);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={`h-8 w-8 md:h-10 md:w-10 flex-shrink-0 ${className}`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
    >
      {isDark ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
    </Button>
  );
}