import { ChevronDown, Image as ImageIcon, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type InlineAiEmailImageLibraryPopoverProps = {
  deleteImageMutation: any;
  imagePreviewError: boolean;
  newImageLabel: string;
  newImageUrl: string;
  saveImageMutation: any;
  savedEmailImages: any[];
  onConvertToDirectImageUrl: (url: string) => string;
  onExtractGoogleDriveFileId: (url: string) => string | null;
  onHandleImageError: (e: React.SyntheticEvent<HTMLImageElement>, originalUrl: string) => void;
  onInsertImageAtCursor: (imageUrl: string, targetField?: "body") => void;
  onSetImagePreviewError: (value: boolean) => void;
  onSetNewImageLabel: (value: string) => void;
  onSetNewImageUrl: (value: string) => void;
};

export function InlineAiEmailImageLibraryPopover({
  deleteImageMutation,
  imagePreviewError,
  newImageLabel,
  newImageUrl,
  saveImageMutation,
  savedEmailImages,
  onConvertToDirectImageUrl,
  onExtractGoogleDriveFileId,
  onHandleImageError,
  onInsertImageAtCursor,
  onSetImagePreviewError,
  onSetNewImageLabel,
  onSetNewImageUrl,
}: InlineAiEmailImageLibraryPopoverProps) {
  const saveImagePending = !!saveImageMutation?.isPending;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-insert-image-body"
        >
          <ImageIcon className="h-4 w-4 mr-1" />
          Image
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Image Library
          </h4>
          {savedEmailImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {savedEmailImages.map((img: any) => (
                <div
                  key={img.id}
                  className="relative group rounded border p-1 hover-elevate cursor-pointer"
                  data-testid={`image-library-item-${img.id}`}
                >
                  <button
                    onClick={() => onInsertImageAtCursor(img.url, "body")}
                    className="w-full"
                    data-testid={`button-insert-image-${img.id}`}
                  >
                    <img
                      src={onConvertToDirectImageUrl(img.url)}
                      alt={img.label}
                      className="w-full h-16 object-cover rounded"
                      onError={(e) => onHandleImageError(e, img.url)}
                    />
                    <p className="text-xs truncate mt-1 text-muted-foreground">{img.label}</p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImageMutation?.mutate?.(img.id);
                    }}
                    className="absolute top-0 right-0 p-0.5 rounded-bl bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`button-delete-image-${img.id}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">No saved images yet</p>
          )}
          <div className="border-t" />
          <div className="space-y-2">
            <p className="text-xs font-medium">Add New Image</p>
            <Input
              placeholder="Paste image URL (Google Drive, etc.)"
              value={newImageUrl.startsWith("data:") ? "Pasted image (use a URL instead)" : newImageUrl}
              onChange={(e) => { onSetNewImageUrl(e.target.value); onSetImagePreviewError(false); }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text/plain");
                if (text && !text.startsWith("data:")) {
                  e.preventDefault();
                  onSetNewImageUrl(text.trim());
                  onSetImagePreviewError(false);
                }
              }}
              className="text-xs"
              data-testid="input-new-image-url"
            />
            <Input
              placeholder="Label (e.g., Product Banner)"
              value={newImageLabel}
              onChange={(e) => onSetNewImageLabel(e.target.value)}
              className="text-xs"
              data-testid="input-new-image-label"
            />
            {newImageUrl && !imagePreviewError && !newImageUrl.startsWith("data:") && (
              <div className="rounded border p-1">
                <img
                  src={onConvertToDirectImageUrl(newImageUrl)}
                  alt="Preview"
                  className="w-full h-20 object-cover rounded"
                  onError={(e) => {
                    const fileId = onExtractGoogleDriveFileId(newImageUrl);
                    if (!fileId) { onSetImagePreviewError(true); return; }
                    const img = e.target as HTMLImageElement;
                    if (img.src.includes("googleusercontent.com")) {
                      img.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
                    } else if (img.src.includes("uc?export=view")) {
                      img.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
                    } else {
                      onSetImagePreviewError(true);
                    }
                  }}
                  data-testid="img-new-image-preview"
                />
              </div>
            )}
            {newImageUrl.startsWith("data:") && (
              <p className="text-xs text-destructive">Please paste a URL link, not an image directly. Use a Google Drive share link or any public image URL.</p>
            )}
            {imagePreviewError && !newImageUrl.startsWith("data:") && (
              <p className="text-xs text-destructive">Could not load image preview. Check the URL.</p>
            )}
            <Button
              size="sm"
              className="w-full"
              disabled={!newImageUrl || !newImageLabel || saveImagePending || newImageUrl.startsWith("data:")}
              onClick={async () => {
                const urlToSave = onConvertToDirectImageUrl(newImageUrl.trim());
                await saveImageMutation?.mutateAsync?.({ url: urlToSave, label: newImageLabel });
                onInsertImageAtCursor(urlToSave, "body");
                onSetNewImageUrl("");
                onSetNewImageLabel("");
                onSetImagePreviewError(false);
              }}
              data-testid="button-save-insert-image"
            >
              {saveImagePending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Save & Insert
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
