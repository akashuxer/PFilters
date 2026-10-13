// Pure helpers for list selection state aggregation used by ArvoList's
// global / per-group select-all rows and Shift+Space range selection.
//
// Selection state itself stays out of @arvo/core (each consumer owns its own
// useState / class field). These are stateless functions consumers compose
// with their own state machinery.

/**
 * Aggregate selection state across a known id universe.
 *
 * Returns:
 *   - 'none' when no selectable id is selected
 *   - 'all'  when every selectable id is selected
 *   - 'some' when at least one but not all selectable ids are selected
 *
 * `selectableIds` should already exclude disabled rows. Empty `selectableIds`
 * collapses to 'none' so a global select-all row over an empty list reads as
 * unchecked rather than indeterminate.
 */
export type AggregateSelectionState = 'none' | 'some' | 'all';

export function aggregateSelectionState(
  selectedIds: readonly string[],
  selectableIds: readonly string[],
): AggregateSelectionState {
  if (selectableIds.length === 0) {
    return 'none';
  }
  if (selectedIds.length === 0) {
    return 'none';
  }
  const selectedSet = new Set(selectedIds);
  let matchedCount = 0;
  for (const id of selectableIds) {
    if (selectedSet.has(id)) {
      matchedCount += 1;
    }
  }
  if (matchedCount === 0) {
    return 'none';
  }
  if (matchedCount === selectableIds.length) {
    return 'all';
  }
  return 'some';
}

/**
 * Compute the next selection set for a Shift+Space range selection.
 *
 * Given an ordered id list, an anchor id (last single-click target), and the
 * focused target id, returns the id set after toggling every id in the closed
 * `[anchor, target]` range to the same selected state as the anchor.
 *
 * If `anchorId` is null the function falls back to a plain single-id toggle on
 * `targetId`. Disabled ids (passed via `disabledIds`) are never included.
 */
export function nextSelectionForRangeShift(
  options: {
    selectedIds: readonly string[];
    orderedIds: readonly string[];
    anchorId: string | null;
    targetId: string;
    disabledIds?: readonly string[];
  },
): string[] {
  const { selectedIds, orderedIds, anchorId, targetId, disabledIds = [] } = options;
  const disabled = new Set(disabledIds);
  const selectedSet = new Set(selectedIds);

  if (anchorId === null || anchorId === targetId) {
    if (disabled.has(targetId)) return [...selectedSet];
    if (selectedSet.has(targetId)) {
      selectedSet.delete(targetId);
    } else {
      selectedSet.add(targetId);
    }
    return [...selectedSet];
  }

  const anchorIndex = orderedIds.indexOf(anchorId);
  const targetIndex = orderedIds.indexOf(targetId);
  if (anchorIndex < 0 || targetIndex < 0) {
    return [...selectedSet];
  }

  const [start, end] =
    anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  const anchorSelected = selectedSet.has(anchorId);

  for (let i = start; i <= end; i += 1) {
    const id = orderedIds[i];
    if (disabled.has(id)) continue;
    if (anchorSelected) {
      selectedSet.add(id);
    } else {
      selectedSet.delete(id);
    }
  }
  return [...selectedSet];
}
