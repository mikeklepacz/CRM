import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Key, Loader2, Save } from "lucide-react";

interface ApiConfigCardProps {
  settingsLoading: boolean;
  hasApiKey: boolean;
  apiKeySuffix?: string;
  showApiKey: boolean;
  apiKey: string;
  savePending: boolean;
  onShowApiKey: (show: boolean) => void;
  onApiKeyChange: (value: string) => void;
  onSave: () => void;
}

export const ApiConfigCard = ({
  settingsLoading,
  hasApiKey,
  apiKeySuffix,
  showApiKey,
  apiKey,
  savePending,
  onShowApiKey,
  onApiKeyChange,
  onSave,
}: ApiConfigCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          OpenAI API Configuration
        </CardTitle>
        <CardDescription>Configure your OpenAI API key to enable the Sales Assistant</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settingsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings...
          </div>
        ) : (
          <div className="space-y-4">
            {hasApiKey && !showApiKey ? (
              <div className="flex items-center gap-2 p-4 border rounded-md bg-muted/50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm">API key is configured (ending in ...{apiKeySuffix})</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => onShowApiKey(true)}
                  data-testid="button-change-api-key"
                >
                  Change Key
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="api-key">OpenAI API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => onApiKeyChange(e.target.value)}
                    data-testid="input-api-key"
                  />
                  <Button onClick={onSave} disabled={savePending} data-testid="button-save-api-key">
                    {savePending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get your API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
