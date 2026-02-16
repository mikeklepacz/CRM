import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Delete } from "lucide-react";
import { useTwilioVoip } from "@/hooks/useTwilioVoip";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export function DtmfDialpad() {
  const { isCallActive, sendDigits, status } = useTwilioVoip();
  const [digits, setDigits] = useState("");
  const [minimized, setMinimized] = useState(false);

  const handlePress = useCallback((digit: string) => {
    sendDigits(digit);
    setDigits((prev) => prev + digit);
  }, [sendDigits]);

  const handleClear = useCallback(() => {
    setDigits("");
  }, []);

  if (!isCallActive) return null;

  if (minimized) {
    return (
      <div
        className="fixed bottom-6 right-6 z-[9999]"
        data-testid="dialpad-minimized"
      >
        <Button
          variant="outline"
          onClick={() => setMinimized(false)}
          data-testid="button-show-dialpad"
        >
          Keypad
        </Button>
      </div>
    );
  }

  return (
    <Card
      className="fixed bottom-6 right-6 z-[9999] w-56 p-3 shadow-lg"
      data-testid="dialpad-card"
    >
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="text-xs text-muted-foreground truncate">
          {status === "connected" ? "In call" : status === "ringing" ? "Ringing..." : "Connecting..."}
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setMinimized(true)}
          data-testid="button-minimize-dialpad"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-1 mb-2 rounded-md bg-muted px-2 min-h-9">
        <span
          className="flex-1 text-center text-lg font-mono tracking-widest truncate"
          data-testid="text-dialpad-digits"
        >
          {digits || "\u00A0"}
        </span>
        {digits && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClear}
            className="shrink-0"
            data-testid="button-clear-digits"
          >
            <Delete className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1">
        {KEYS.flat().map((key) => (
          <Button
            key={key}
            variant="outline"
            onClick={() => handlePress(key)}
            data-testid={`button-dial-${key === "*" ? "star" : key === "#" ? "hash" : key}`}
          >
            <span className="text-base font-semibold">{key}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
}
