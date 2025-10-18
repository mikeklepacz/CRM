import { Moon, Sun, Monitor, MoonStar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./theme-provider";

interface ThemeToggleProps {
  showLabel?: boolean;
  variant?: "ghost" | "outline" | "default";
}

export function ThemeToggle({ showLabel = false, variant = "ghost" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={showLabel ? "default" : "icon"} data-testid="button-theme-toggle">
          <Sun className="h-4 w-4 dark:hidden" />
          <MoonStar className="h-4 w-4 hidden dark:block" />
          {showLabel && <span>Theme</span>}
          {!showLabel && <span className="sr-only">Toggle theme</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")} data-testid="theme-light">
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          {theme === "light" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} data-testid="theme-dark">
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          {theme === "dark" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("auto")} data-testid="theme-auto">
          <Monitor className="mr-2 h-4 w-4" />
          <span>Auto</span>
          {theme === "auto" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
