import type { Ref } from "vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

export type GridPaginationOptions = {
  minTileWidthPx: number;
  gapPx: number;
  aspectWidth: number; // e.g. 16
  aspectHeight: number; // e.g. 9
  reservedBottomPx?: number; // space for meeting controls / paging UI overlays
};

type GridLayout = {
  pageSize: number;
  cols: number;
  rows: number;
  tileW: number;
  tileH: number;
};

function computeTileW(params: {
  W: number;
  H: number;
  cols: number;
  rows: number;
  gap: number;
  aspectW: number;
  aspectH: number;
}) {
  const { W, H, cols, rows, gap, aspectW, aspectH } = params;
  const byWidth = (W - gap * (cols - 1)) / cols;
  const byHeight = ((H - gap * (rows - 1)) * aspectW) / (rows * aspectH);
  return Math.min(byWidth, byHeight);
}

function bestLayoutForK(params: {
  k: number;
  W: number;
  H: number;
  gap: number;
  aspectW: number;
  aspectH: number;
}) {
  const { k, W, H, gap, aspectW, aspectH } = params;
  let best: { cols: number; rows: number; tileW: number } | null = null;

  for (let cols = 1; cols <= k; cols++) {
    const rows = Math.ceil(k / cols);
    const tileW = computeTileW({ W, H, cols, rows, gap, aspectW, aspectH });
    if (!Number.isFinite(tileW) || tileW <= 0) continue;
    if (!best || tileW > best.tileW) best = { cols, rows, tileW };
  }

  return best;
}

function bestPagedCapacity(params: {
  n: number;
  W: number;
  H: number;
  gap: number;
  aspectW: number;
  aspectH: number;
  minTileW: number;
}) {
  const { n, W, H, gap, aspectW, aspectH, minTileW } = params;
  let best: { cols: number; rows: number; pageSize: number; tileW: number } | null = null;

  for (let cols = 1; cols <= n; cols++) {
    const tileWByWidth = (W - gap * (cols - 1)) / cols;
    if (tileWByWidth < minTileW) break; // more cols => smaller

    const minTileH = minTileW * (aspectH / aspectW);
    const rowsMax = Math.max(1, Math.floor((H + gap) / (minTileH + gap)));
    const capacity = cols * rowsMax;
    const pageSize = Math.min(n, capacity);

    // actual tileW for the rows used on a full page
    const rowsUsed = Math.ceil(pageSize / cols);
    const tileW = computeTileW({ W, H, cols, rows: rowsUsed, gap, aspectW, aspectH });

    if (tileW < minTileW) continue;

    if (!best || pageSize > best.pageSize || (pageSize === best.pageSize && tileW > best.tileW)) {
      best = { cols, rows: rowsUsed, pageSize, tileW };
    }
  }

  return best;
}

export function useGridPagination(
  containerEl: Ref<HTMLElement | null>,
  itemsCount: Ref<number>,
  opts: GridPaginationOptions,
) {
  const width = ref(0);
  const height = ref(0);
  let ro: ResizeObserver | null = null;

  function measure(el: HTMLElement) {
    width.value = el.clientWidth || 0;
    height.value = el.clientHeight || 0;
  }

  onMounted(() => {
    const el = containerEl.value;
    if (!el) return;
    measure(el);
    ro = new ResizeObserver(() => measure(el));
    ro.observe(el);
  });

  onBeforeUnmount(() => {
    ro?.disconnect();
    ro = null;
  });

  const availableHeight = computed(() => {
    const reserved = opts.reservedBottomPx ?? 0;
    return Math.max(0, height.value - reserved);
  });

  const layout = computed<GridLayout>(() => {
    const n = Math.max(0, Math.floor(itemsCount.value || 0));
    const W = width.value;
    const H = availableHeight.value;
    const gap = opts.gapPx;
    const aspectW = opts.aspectWidth;
    const aspectH = opts.aspectHeight;
    const minTileW = opts.minTileWidthPx;

    if (!n || !W || !H) {
      return {
        pageSize: Math.max(1, n || 1),
        cols: 1,
        rows: 1,
        tileW: W || minTileW,
        tileH: (W || minTileW) * (aspectH / aspectW),
      };
    }

    // Exception: for very small meetings, prefer "fill the container" over preserving 16:9.
    // 1 tile: fills whole container
    // 2 tiles: side-by-side, each fills half width and full height (no stacking)
    // 3 tiles: 3 columns, full height (no stacking)
    if (n <= 3) {
      const cols = n;
      const tileW = Math.max(1, (W - gap * (cols - 1)) / cols);
      const tileH = Math.max(1, H);
      return { pageSize: n, cols, rows: 1, tileW, tileH };
    }

    // First try to fit ALL tiles without pagination, maximizing tile size
    const bestAll = bestLayoutForK({ k: n, W, H, gap, aspectW, aspectH });
    if (bestAll && bestAll.tileW >= minTileW) {
      const tileH = bestAll.tileW * (aspectH / aspectW);
      return { pageSize: n, cols: bestAll.cols, rows: bestAll.rows, tileW: bestAll.tileW, tileH };
    }

    // Otherwise paginate: maximize tilesShown first, then tile size
    const bestPaged = bestPagedCapacity({ n, W, H, gap, aspectW, aspectH, minTileW });
    if (bestPaged) {
      const tileH = bestPaged.tileW * (aspectH / aspectW);
      return {
        pageSize: bestPaged.pageSize,
        cols: bestPaged.cols,
        rows: bestPaged.rows,
        tileW: bestPaged.tileW,
        tileH,
      };
    }

    // Fallback: always show at least 1 tile
    const fallbackW = Math.max(1, Math.min(W, minTileW));
    return { pageSize: 1, cols: 1, rows: 1, tileW: fallbackW, tileH: fallbackW * (aspectH / aspectW) };
  });

  return { width, height, availableHeight, layout };
}
