import { useState } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  STORE_DETAILS_DEFAULT_SECTION_ORDER,
  STORE_DETAILS_SECTION_ORDER_KEY,
} from "@/components/store-details/store-details-dialog-constants";

export function useStoreDetailsSectionOrder() {
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORE_DETAILS_SECTION_ORDER_KEY);
      if (!stored) return STORE_DETAILS_DEFAULT_SECTION_ORDER;
      const parsed = JSON.parse(stored);
      return parsed.filter((s: string) => s !== "basic-info");
    } catch (error) {
      console.warn("Failed to parse stored section order, using default:", error);
      return STORE_DETAILS_DEFAULT_SECTION_ORDER;
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(STORE_DETAILS_SECTION_ORDER_KEY, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  return {
    sectionOrder,
    sensors,
    handleDragEnd,
  };
}
