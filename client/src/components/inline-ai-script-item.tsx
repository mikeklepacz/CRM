import { FileText } from "lucide-react";

type InlineAiScriptItemProps = {
  content: string;
  id: string;
  title: string;
};

export function InlineAiScriptItem({
  content,
  id,
  title,
}: InlineAiScriptItemProps) {
  return (
    <div key={id} className="border-2 border-primary/30 rounded-lg bg-card p-4" data-testid={`script-${id}`}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
