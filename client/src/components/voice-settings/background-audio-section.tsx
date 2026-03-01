import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, CheckCircle, Loader2, Upload, Volume2 } from "lucide-react";
import type { BackgroundAudioSettings } from "./voice-settings-types";

export function BackgroundAudioSection({
  backgroundAudioSettings,
  uploadingAudio,
  onFileUpload,
  localVolumeDb,
  setLocalVolumeDb,
  handleVolumeCommit,
  toast,
}: {
  backgroundAudioSettings?: BackgroundAudioSettings;
  uploadingAudio: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  localVolumeDb: number | null;
  setLocalVolumeDb: (value: number) => void;
  handleVolumeCommit: (value: number) => void;
  toast: any;
}) {
  return (
    <AccordionItem value="background-audio" className="border rounded-lg">
      <AccordionTrigger
        className="px-6 hover:no-underline"
        data-testid="accordion-background-audio"
      >
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          <span className="font-semibold">Background Audio Settings</span>
          {(backgroundAudioSettings?.activeSessions ?? 0) > 0 && (
            <Badge variant="default" className="ml-2">
              {backgroundAudioSettings?.activeSessions ?? 0} active
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload and configure a background audio loop that plays continuously
            during all voice calls at a low volume
          </p>

          {backgroundAudioSettings?.fileName && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">
                      Current file: {backgroundAudioSettings.fileName}
                    </p>
                    {backgroundAudioSettings.uploadedAt && (
                      <p className="text-xs text-muted-foreground">
                        Uploaded: {new Date(backgroundAudioSettings.uploadedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Preview Audio</Label>
                <audio
                  controls
                  className="w-full"
                  data-testid="audio-preview"
                  src="/api/voice-proxy/background-audio/file"
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          )}

          {!backgroundAudioSettings?.fileName && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No background audio file uploaded yet. Upload a file below to enable
                background audio mixing.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="audio-upload">Upload Audio File</Label>
            <div className="flex gap-2">
              <Input
                id="audio-upload"
                type="file"
                accept="audio/*"
                onChange={onFileUpload}
                disabled={uploadingAudio}
                data-testid="input-audio-upload"
              />
              <Button
                variant="outline"
                disabled={uploadingAudio}
                onClick={() => document.getElementById("audio-upload")?.click()}
                data-testid="button-upload-audio"
              >
                {uploadingAudio ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload any audio format. It will be automatically converted to 16-bit
              PCM 16kHz mono for optimal mixing.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Background Volume</Label>
              <span className="text-sm text-muted-foreground">
                {localVolumeDb ?? backgroundAudioSettings?.volumeDb ?? -25} dB
              </span>
            </div>
            <Slider
              min={-40}
              max={-10}
              step={1}
              value={[localVolumeDb ?? backgroundAudioSettings?.volumeDb ?? -25]}
              onValueChange={(value) => setLocalVolumeDb(value[0])}
              onValueCommit={(value) => handleVolumeCommit(value[0])}
              disabled={!backgroundAudioSettings?.fileName}
              data-testid="slider-background-volume"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Adjust the background audio volume relative to voice speech. Lower
              values (e.g., -30dB) are more subtle.
            </p>
          </div>

          {backgroundAudioSettings?.websocketUrl && (
            <div className="space-y-2 pt-4 border-t">
              <Label>WebSocket Proxy Endpoint</Label>
              <div className="flex gap-2">
                <Input
                  value={backgroundAudioSettings.websocketUrl}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-websocket-url"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(backgroundAudioSettings.websocketUrl);
                    toast({
                      title: "Copied",
                      description: "WebSocket URL copied to clipboard",
                    });
                  }}
                  data-testid="button-copy-websocket-url"
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this URL in your Twilio TwiML &lt;Stream&gt; to route calls
                through the background audio mixer
              </p>
            </div>
          )}

          {backgroundAudioSettings?.activeSessions !== undefined && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Call Sessions</span>
                <Badge
                  variant={
                    backgroundAudioSettings.activeSessions > 0 ? "default" : "outline"
                  }
                >
                  {backgroundAudioSettings.activeSessions}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Number of live calls currently being routed through the proxy with
                background audio
              </p>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
