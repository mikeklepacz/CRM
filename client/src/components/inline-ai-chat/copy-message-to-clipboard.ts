export async function copyMessageToClipboardUtil(content: string, toast: any) {
  const selectedText = window.getSelection()?.toString().trim();
  const textToCopy = selectedText || content;

  try {
    await navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Copied",
      description: selectedText ? "Selected text copied to clipboard" : "Message copied to clipboard",
    });
  } catch {
    toast({
      title: "Error",
      description: "Failed to copy to clipboard",
      variant: "destructive",
    });
  }
}
