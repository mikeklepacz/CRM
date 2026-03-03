import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Tag, Trash2 } from "lucide-react";

export function InlineAiTemplateBuilderTagsInput(props: any) {
  const {
    builderTags,
    deleteTagsMutation,
    handleDeleteSelectedTags,
    insertTag,
    selectedTagIds,
    setBuilderTags,
    setSelectedTagIds,
    setTagEditMode,
    tagEditMode,
    toggleTagSelection,
    userTags,
  } = props;
  const deleteTagsPending = !!deleteTagsMutation?.isPending;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold">Tags</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-insert-tag">
              <Tag className="h-4 w-4 mr-1" />
              My Tags
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Your Personal Tags
                </h4>
                {userTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTagEditMode(!tagEditMode);
                      if (tagEditMode) {
                        setSelectedTagIds(new Set());
                      }
                    }}
                    data-testid="button-edit-tags"
                  >
                    {tagEditMode ? "Done" : "Edit"}
                  </Button>
                )}
              </div>

              {tagEditMode && selectedTagIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleDeleteSelectedTags}
                  disabled={deleteTagsPending}
                  data-testid="button-delete-selected-tags"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedTagIds.size} tag{selectedTagIds.size > 1 ? "s" : ""}
                </Button>
              )}

              {userTags.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No tags yet. Tags you use in templates will appear here.
                </p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {userTags.map((userTag: any) => (
                    <button
                      key={userTag.id}
                      onClick={() => (tagEditMode ? toggleTagSelection(userTag.id) : insertTag(userTag.tag))}
                      className="w-full text-left p-2 rounded hover-elevate flex items-center justify-between group"
                      data-testid={`${tagEditMode ? "toggle" : "insert"}-tag-${userTag.tag}`}
                    >
                      <div className="flex items-center gap-2">
                        {tagEditMode && (
                          <input
                            type="checkbox"
                            checked={selectedTagIds.has(userTag.id)}
                            onChange={() => toggleTagSelection(userTag.id)}
                            className="h-4 w-4"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <span className="text-sm">{userTag.tag}</span>
                      </div>
                      {!tagEditMode && <Badge variant="outline" className="text-xs">Click to add</Badge>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Input
        placeholder="email, follow-up, introduction..."
        value={builderTags}
        onChange={(e) => setBuilderTags(e.target.value)}
        data-testid="input-builder-tags"
      />
      <p className="text-xs text-muted-foreground">Comma-separated tags</p>
    </div>
  );
}
