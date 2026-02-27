type SidebarToggleParams = {
  isOpen: boolean;
  setConversationsOpen: (value: boolean) => void;
  setTemplatesOpen: (value: boolean) => void;
};

export function handleConversationsPanelToggle({
  isOpen,
  setConversationsOpen,
  setTemplatesOpen,
}: SidebarToggleParams) {
  if (isOpen) {
    setTemplatesOpen(false);
    try { localStorage.setItem("wickCoach_templatesOpen", "false"); } catch {}
  }
  setConversationsOpen(isOpen);
  try { localStorage.setItem("wickCoach_conversationsOpen", String(isOpen)); } catch {}
}

export function handleTemplatesPanelToggle({
  isOpen,
  setConversationsOpen,
  setTemplatesOpen,
}: SidebarToggleParams) {
  if (isOpen) {
    setConversationsOpen(false);
    try { localStorage.setItem("wickCoach_conversationsOpen", "false"); } catch {}
  }
  setTemplatesOpen(isOpen);
  try { localStorage.setItem("wickCoach_templatesOpen", String(isOpen)); } catch {}
}
