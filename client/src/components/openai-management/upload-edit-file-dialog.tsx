import { type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { Agent, Category, OpenAIFile } from "./types";

interface UploadEditFileDialogProps {
  open: boolean;
  editingFile: OpenAIFile | null;
  fileContent: string;
  fileName: string;
  fileCategory: string;
  productCategory: string;
  fileDescription: string;
  selectedAgentId: string;
  categories: Category[];
  agents: Agent[];
  uploadPending: boolean;
  editPending: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onFileNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onProductCategoryChange: (value: string) => void;
  onAgentIdChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
}

export const UploadEditFileDialog = ({
  open,
  editingFile,
  fileContent,
  fileName,
  fileCategory,
  productCategory,
  fileDescription,
  selectedAgentId,
  categories,
  agents,
  uploadPending,
  editPending,
  onOpenChange,
  onFileSelect,
  onFileNameChange,
  onCategoryChange,
  onProductCategoryChange,
  onAgentIdChange,
  onDescriptionChange,
  onSubmit,
}: UploadEditFileDialogProps) => {
  const pending = editingFile ? editPending : uploadPending;
  const disabled = editingFile ? editPending : uploadPending || !fileName || !fileContent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingFile ? "Edit Knowledge Base File" : "Upload Knowledge Base File"}</DialogTitle>
          <DialogDescription>
            {editingFile
              ? "Update file metadata and category assignment"
              : "Add sales scripts, product info, or objection handlers to help agents"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!editingFile && (
            <div className="space-y-2">
              <Label>Upload File</Label>
              <Input type="file" accept=".txt,.md,.pdf,.docx" onChange={onFileSelect} data-testid="input-file-upload" />
              <p className="text-xs text-muted-foreground">Supported formats: .txt, .md, .pdf, .docx</p>
            </div>
          )}

          {editingFile ? (
            <div className="space-y-2">
              <Label>Filename</Label>
              <Input value={editingFile.originalName} disabled className="bg-muted" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={fileName}
                onChange={(e) => onFileNameChange(e.target.value)}
                placeholder="e.g., cold-call-script.txt"
                data-testid="input-filename"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={fileCategory} onValueChange={onCategoryChange}>
              <SelectTrigger data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scripts">Sales Scripts</SelectItem>
                <SelectItem value="objections">Objection Handlers</SelectItem>
                <SelectItem value="product-info">Product Information</SelectItem>
                <SelectItem value="best-practices">Best Practices</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="productCategory">Product Category</Label>
            <Select value={productCategory} onValueChange={onProductCategoryChange}>
              <SelectTrigger data-testid="select-product-category">
                <SelectValue placeholder="Select product line..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Determines which sales teams can access this file</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agentAssignment">Assign to Agent (Optional)</Label>
            <Select value={selectedAgentId} onValueChange={onAgentIdChange}>
              <SelectTrigger data-testid="select-kb-agent">
                <SelectValue placeholder="Not assigned to specific agent..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Available to all agents)</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.agentId}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Assign this KB file to a specific AI agent for personalized knowledge
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={fileDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Brief description of what this file contains..."
              rows={3}
              data-testid="input-description"
            />
          </div>

          {fileContent && !fileName.endsWith(".pdf") && !fileName.endsWith(".docx") && (
            <div className="space-y-2">
              <Label>File Preview</Label>
              <div className="border rounded-md p-3 bg-muted/50 max-h-48 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {fileContent.slice(0, 500)}
                  {fileContent.length > 500 && "..."}
                </pre>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-upload">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={disabled}
            data-testid={editingFile ? "button-confirm-edit" : "button-confirm-upload"}
            data-primary="true"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {editingFile ? "Saving..." : "Uploading..."}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {editingFile ? "Save Changes" : "Upload"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
