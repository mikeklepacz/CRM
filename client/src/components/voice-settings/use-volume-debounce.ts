import { useEffect, useRef, useState } from "react";
import type { BackgroundAudioSettings } from "./voice-settings-types";

export function useVolumeDebounce({
  backgroundAudioSettings,
  onCommit,
}: {
  backgroundAudioSettings?: BackgroundAudioSettings;
  onCommit: (value: number) => void;
}) {
  const [localVolumeDb, setLocalVolumeDb] = useState<number | null>(null);
  const volumeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (backgroundAudioSettings?.volumeDb !== undefined) {
      setLocalVolumeDb(backgroundAudioSettings.volumeDb);
    }
  }, [backgroundAudioSettings?.volumeDb]);

  useEffect(() => {
    return () => {
      if (volumeDebounceRef.current) {
        clearTimeout(volumeDebounceRef.current);
      }
    };
  }, []);

  const handleVolumeCommit = (value: number) => {
    if (volumeDebounceRef.current) {
      clearTimeout(volumeDebounceRef.current);
    }
    volumeDebounceRef.current = setTimeout(() => {
      onCommit(value);
    }, 500);
  };

  return {
    localVolumeDb,
    setLocalVolumeDb,
    handleVolumeCommit,
  };
}
