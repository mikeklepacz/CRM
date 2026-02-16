import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Hash, Delete } from "lucide-react";
import { useTwilioVoip } from "@/hooks/useTwilioVoip";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export function DtmfDialpad() {
  const { isCallActive, sendDigits } = useTwilioVoip();
  const [digits, setDigits] = useState("");
  const [open, setOpen] = useState(false);

  const handlePress = useCallback((digit: string) => {
    sendDigits(digit);
    setDigits((prev) => prev + digit);
  }, [sendDigits]);

  const handleClear = useCallback(() => {
    setDigits("");
  }, []);

  if (!isCallActive) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-testid="button-toggle-dialpad"
        >
          <Hash className="h-4 w-4 mr-2" />
          Keypad
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-52 p-3"
        data-testid="dialpad-popover"
      >
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
      </PopoverContent>
    </Popover>
  );
}
