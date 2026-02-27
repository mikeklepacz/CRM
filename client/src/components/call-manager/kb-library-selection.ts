export function toggleSelectedId(current: string[], nextId: string): string[] {
  return current.includes(nextId) ? current.filter((id) => id !== nextId) : [...current, nextId];
}

export function toggleAllVisibleIds(current: string[], visibleIds: string[]): string[] {
  const allVisibleSelected = visibleIds.every((id) => current.includes(id));

  if (allVisibleSelected) {
    return current.filter((id) => !visibleIds.includes(id));
  }

  return [...new Set([...current, ...visibleIds])];
}

export function toggleTwoItemSelection(current: string[], nextId: string): string[] {
  if (current.includes(nextId)) {
    return current.filter((id) => id !== nextId);
  }
  if (current.length < 2) {
    return [...current, nextId];
  }
  return [current[1], nextId];
}
