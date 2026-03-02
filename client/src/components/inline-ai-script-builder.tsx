import type { RefObject } from "react";
import { Calendar, ChevronDown, Mail, Store, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

type VariableOption = {
  name: string;
  description: string;
};

type InlineAiScriptBuilderProps = {
  availableVariables: VariableOption[];
  builderContent: string;
  contentTextareaRef: RefObject<HTMLTextAreaElement>;
  onBuilderContentChange: (value: string) => void;
  onInsertVariable: (variableName: string) => void;
};

export function InlineAiScriptBuilder({
  availableVariables,
  builderContent,
  contentTextareaRef,
  onBuilderContentChange,
  onInsertVariable,
}: InlineAiScriptBuilderProps) {
  return (
    <div className="space-y-3 flex-1 flex flex-col">
      <div className="space-y-2 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm font-semibold">Content</label>
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-insert-store-variable"
                >
                  <Store className="h-4 w-4 mr-1" />
                  Store
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Store Information
                  </h4>
                  <div className="space-y-1">
                    {availableVariables
                      .filter(v => ["storeName", "storeAddress", "storeCity", "storeState", "storeWebsite", "storePhone"].includes(v.name))
                      .map((variable) => (
                        <button
                          key={variable.name}
                          onClick={() => onInsertVariable(variable.name)}
                          className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                          data-testid={`insert-variable-${variable.name}`}
                        >
                          <div className="font-mono text-sm text-primary">
                            {`{{${variable.name}}}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {variable.description}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-insert-contact-variable"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Contact
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Information
                  </h4>
                  <div className="space-y-1">
                    {availableVariables
                      .filter(v => ["email", "pocName", "pocEmail", "pocPhone"].includes(v.name))
                      .map((variable) => (
                        <button
                          key={variable.name}
                          onClick={() => onInsertVariable(variable.name)}
                          className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                          data-testid={`insert-variable-${variable.name}`}
                        >
                          <div className="font-mono text-sm text-primary">
                            {`{{${variable.name}}}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {variable.description}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-insert-agent-variable"
                >
                  <UserIcon className="h-4 w-4 mr-1" />
                  Agent
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Agent Information
                  </h4>
                  <div className="space-y-1">
                    {availableVariables
                      .filter(v => ["agentName", "agentEmail", "agentPhone", "agentMeetingLink"].includes(v.name))
                      .map((variable) => (
                        <button
                          key={variable.name}
                          onClick={() => onInsertVariable(variable.name)}
                          className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                          data-testid={`insert-variable-${variable.name}`}
                        >
                          <div className="font-mono text-sm text-primary">
                            {`{{${variable.name}}}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {variable.description}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-insert-datetime-variable"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Date/Time
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date & Time
                  </h4>
                  <div className="space-y-1">
                    {availableVariables
                      .filter(v => ["currentDate", "currentTime"].includes(v.name))
                      .map((variable) => (
                        <button
                          key={variable.name}
                          onClick={() => onInsertVariable(variable.name)}
                          className="w-full text-left p-2 rounded hover-elevate flex flex-col gap-1"
                          data-testid={`insert-variable-${variable.name}`}
                        >
                          <div className="font-mono text-sm text-primary">
                            {`{{${variable.name}}}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {variable.description}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Textarea
          ref={contentTextareaRef}
          placeholder="Template content with {{variables}}..."
          value={builderContent}
          onChange={(e) => onBuilderContentChange(e.target.value)}
          className="flex-1 min-h-[200px] font-mono"
          data-testid="textarea-builder-content"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Use variables like: {`{{storeName}}, {{pocName}}, {{pocEmail}}`}
      </p>
    </div>
  );
}
