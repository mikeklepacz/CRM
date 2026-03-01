import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useInlineAiTemplateMutations({
  toast,
  userTags,
  setBuilderTitle,
  setBuilderContent,
  setBuilderType,
  setBuilderTags,
  setBuilderIsDefault,
  setEditingTemplateId,
  setSelectedTagIds,
  setTagEditMode,
}: {
  toast: any;
  userTags: Array<{ id: string; userId: string; tag: string; createdAt: Date }>;
  setBuilderTitle: (value: string) => void;
  setBuilderContent: (value: string) => void;
  setBuilderType: (value: "Email" | "Script") => void;
  setBuilderTags: (value: string) => void;
  setBuilderIsDefault: (value: boolean) => void;
  setEditingTemplateId: (value: string | null) => void;
  setSelectedTagIds: (value: Set<string>) => void;
  setTagEditMode: (value: boolean) => void;
}) {
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      return await apiRequest("DELETE", `/api/email-images/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-images"] });
    },
  });

  const saveImageMutation = useMutation({
    mutationFn: async (data: { url: string; label: string }) => {
      return await apiRequest("POST", "/api/email-images", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-images"] });
      toast({ title: "Image saved", description: "Image added to your library" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save image",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: {
      title: string;
      content: string;
      type: string;
      tags: string[];
      isDefault?: boolean;
    }) => {
      const result = await apiRequest("POST", "/api/templates", template);

      for (const tag of template.tags) {
        const existingTag = userTags.find((ut) => ut.tag.toLowerCase() === tag.toLowerCase());
        if (!existingTag) {
          await apiRequest("POST", "/api/user-tags", { tag });
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-tags"] });
      setBuilderTitle("");
      setBuilderContent("");
      setBuilderType("Email");
      setBuilderTags("");
      setBuilderIsDefault(false);
      setEditingTemplateId(null);
      toast({ title: "Success", description: "Template saved" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({
      id,
      template,
    }: {
      id: string;
      template: {
        title: string;
        content: string;
        type: string;
        tags: string[];
        isDefault?: boolean;
      };
    }) => {
      const result = await apiRequest("PATCH", `/api/templates/${id}`, template);

      for (const tag of template.tags) {
        const existingTag = userTags.find((ut) => ut.tag.toLowerCase() === tag.toLowerCase());
        if (!existingTag) {
          await apiRequest("POST", "/api/user-tags", { tag });
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-tags"] });
      setBuilderTitle("");
      setBuilderContent("");
      setBuilderType("Email");
      setBuilderTags("");
      setEditingTemplateId(null);
      toast({ title: "Success", description: "Template updated" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return await apiRequest("DELETE", `/api/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates/tags"] });
      toast({ title: "Success", description: "Template deleted" });
    },
  });

  const deleteTagsMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      for (const id of tagIds) {
        await apiRequest("DELETE", `/api/user-tags/by-id/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-tags"] });
      setSelectedTagIds(new Set());
      setTagEditMode(false);
      toast({ title: "Success", description: "Tags deleted" });
    },
  });

  return {
    deleteImageMutation,
    saveImageMutation,
    createTemplateMutation,
    updateTemplateMutation,
    deleteTemplateMutation,
    deleteTagsMutation,
  };
}
