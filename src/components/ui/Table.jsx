import React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// The table shell (scroll container, <colgroup>, header) always renders,
// even with zero rows — only the tbody content swaps between real rows and
// the empty-state row. This keeps column widths, the header, and the
// surrounding card/toolbar/pagination from jumping around every time a
// filter change (or property selection change) drives the row count to 0
// and back.
export function Table({ columns, data, sortKey, sortDir, onSort, renderRow, rowKey, emptyState, stickyHeader = false, minWidth }) {
  // `table-layout: fixed` + `width: 100%` (see components.css) means a
  // column left without an explicit width (e.g. the "widest" Hotel/Name
  // column) only gets the container's *remaining* space — which, once a
  // grid has many fixed-width columns, can shrink to a few unreadable
  // pixels on anything narrower than a very wide monitor, instead of
  // triggering the horizontal scrollbar `.table-scroll` provides. Passing
  // `minWidth` (the sum of every column's width, including a sane floor for
  // the flexible one) guarantees that never happens: below that width the
  // table scrolls instead of squeezing a column into illegibility.
  return (
    <div className="table-scroll">
      <table className={`table ${stickyHeader ? "table--sticky-header" : ""}`} style={{ tableLayout: "fixed", minWidth: minWidth || undefined }}>
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => {
              const isSorted = col.sortable && sortKey === col.key;
              const ariaSort = !col.sortable ? undefined : isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none";
              return (
                <th
                  key={col.key}
                  className={col.sortable ? "table__th table__th--sortable" : "table__th"}
                  onClick={() => col.sortable && onSort(col.key)}
                  onKeyDown={(e) => {
                    if (col.sortable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onSort(col.key);
                    }
                  }}
                  tabIndex={col.sortable ? 0 : undefined}
                  aria-sort={ariaSort}
                >
                  <span className="table__th-content">
                    {col.label}
                    {col.sortable &&
                      (isSorted ? (
                        sortDir === "asc" ? (
                          <ChevronUp size={14} strokeWidth={2} />
                        ) : (
                          <ChevronDown size={14} strokeWidth={2} />
                        )
                      ) : (
                        <ChevronsUpDown size={14} strokeWidth={2} className="table__sort-idle" />
                      ))}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody key={data.length ? "data" : "empty"} className="table__tbody-transition">
          {data.length ? (
            data.map((row) => renderRow(row, rowKey(row)))
          ) : (
            <tr className="table__empty-row">
              <td colSpan={columns.length}>{emptyState}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
