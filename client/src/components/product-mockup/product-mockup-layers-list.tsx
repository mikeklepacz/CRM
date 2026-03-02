import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Eye, EyeOff, Layers, Trash2 } from 'lucide-react';
import type { LabelElement } from '@/components/product-mockup/product-mockup.types';

type Props = {
  elements: LabelElement[];
  selectedId: string | null;
  deleteElement: (id: string) => void;
  moveElement: (id: string, direction: 'up' | 'down') => void;
  setSelectedId: (id: string | null) => void;
  toggleVisibility: (id: string) => void;
};

export function ProductMockupLayersList({
  elements,
  selectedId,
  deleteElement,
  moveElement,
  setSelectedId,
  toggleVisibility,
}: Props) {
  if (elements.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-lg">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
        <Layers className="h-4 w-4" />
        <span className="text-sm font-medium">Layers ({elements.length})</span>
      </div>
      <ScrollArea className="max-h-32">
        <div className="divide-y">
          {[...elements].reverse().map((el, idx) => (
            <div
              key={el.id}
              className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/50 ${
                selectedId === el.id ? 'bg-primary/10' : ''
              }`}
              onClick={() => setSelectedId(el.id)}
              data-testid={`layer-item-${idx}`}
            >
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisibility(el.id);
                }}
              >
                {el.visible !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
              </Button>
              <div className="w-4 h-4 rounded border" style={{ backgroundColor: el.type === 'text' ? (el.color || '#1a1a1a') : '#888' }} />
              <span className={`flex-1 text-xs truncate ${el.visible === false ? 'text-muted-foreground' : ''}`}>
                {el.type === 'text' ? el.content : 'Logo'}
              </span>
              <div className="flex gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveElement(el.id, 'up');
                  }}
                  disabled={idx === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveElement(el.id, 'down');
                  }}
                  disabled={idx === elements.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteElement(el.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
