import { type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { formatFileSize } from "./utils";

interface UploadDialogProps {
  open: boolean;
  selectedFile: File | null;
  fileCategory: string;
  uploadPending: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onCategoryChange: (value: string) => void;
  onUpload: () => void;
}

export function AlignerUploadDialog({
  open,
  selectedFile,
  fileCategory,
  uploadPending,
  onOpenChange,
  onFileSelect,
  onCategoryChange,
  onUpload,
}: UploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Aligner Knowledge Base File</DialogTitle>
          <DialogDescription>Add reference materials for call analysis and KB improvement proposals (max 50MB)</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Upload File</Label>
            <Input type="file" accept=".txt,.md,.pdf,.docx,.csv" onChange={onFileSelect} data-testid="input-aligner-file-upload" />
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
            <p className="text-xs text-muted-foreground">Supported formats: .txt, .md, .pdf, .docx, .csv (max 50MB)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aligner-category">Category</Label>
            <Select value={fileCategory} onValueChange={onCategoryChange}>
              <SelectTrigger data-testid="select-aligner-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call-data">Call Analysis Data</SelectItem>
                <SelectItem value="objections">Objection Patterns</SelectItem>
                <SelectItem value="best-practices">Best Practices</SelectItem>
                <SelectItem value="product-info">Product Information</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-aligner-upload">
            Cancel
          </Button>
          <Button onClick={onUpload} disabled={uploadPending} data-testid="button-confirm-aligner-upload" data-primary="true">
            {uploadPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
