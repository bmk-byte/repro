/**
 * Computes a chart container height that grows with the number of items,
 * so a vertical bar chart's category axis (long/variable-length names) has
 * room to breathe instead of overlapping when there are many categories.
 *
 * @param itemCount number of categories/bars being rendered
 * @param minHeight floor height (px) to use when itemCount is small
 * @param perItem   additional px allotted per category (default 44, enough
 *                  for a bar + label at the app's default font size)
 */
export function chartHeight(itemCount: number, minHeight: number, perItem = 44): number {
  return Math.max(minHeight, itemCount * perItem);
}
