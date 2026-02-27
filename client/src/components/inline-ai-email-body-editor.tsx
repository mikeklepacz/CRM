import type { RefObject } from "react";
import { Textarea } from "@/components/ui/textarea";

type InlineAiEmailBodyEditorProps = {
  emailBody: string;
  emailBodyRef: RefObject<HTMLTextAreaElement>;
  onConvertToDirectImageUrl: (url: string) => string;
  onEmailBodyChange: (value: string) => void;
  onHandleImageError: (e: React.SyntheticEvent<HTMLImageElement>, originalUrl: string) => void;
};

export function InlineAiEmailBodyEditor({
  emailBody,
  emailBodyRef,
  onConvertToDirectImageUrl,
  onEmailBodyChange,
  onHandleImageError,
}: InlineAiEmailBodyEditorProps) {
  return (
    <>
      <Textarea
        ref={emailBodyRef}
        placeholder="Email body with {{variables}}..."
        value={emailBody}
        onChange={(e) => onEmailBodyChange(e.target.value)}
        className="flex-1 min-h-[200px] font-mono"
        data-testid="textarea-email-body"
      />
      {(() => {
        const imageMatches = emailBody.match(/\{\{image:(.*?)\}\}/g);
        if (!imageMatches || imageMatches.length === 0) return null;
        const imageUrls = imageMatches.map(m => m.replace(/^\{\{image:/, "").replace(/\}\}$/, ""));
        return (
          <div className="flex gap-2 flex-wrap py-1" data-testid="inline-image-previews">
            {imageUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-1.5 rounded border p-1 bg-muted/30">
                <img
                  src={onConvertToDirectImageUrl(url)}
                  alt={`Image ${idx + 1}`}
                  className="h-10 w-10 object-cover rounded"
                  onError={(e) => onHandleImageError(e, url)}
                />
                <span className="text-xs text-muted-foreground max-w-[120px] truncate">{url.split("/").pop() || "Image"}</span>
              </div>
            ))}
          </div>
        );
      })()}
      <p className="text-xs text-muted-foreground">
        Use variables like: {`{{storeName}}, {{pocName}}, {{pocEmail}}`}
      </p>
    </>
  );
}
