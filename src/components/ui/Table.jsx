import React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// The table shell (scroll container, <colgroup>, header) always renders,
// even with zero rows — only the tbody content swaps between real rows and
// the empty-state row. This keeps column widths, the header, and the
// surrounding card/toolbar/pagination from jumping around every time a
// filter change (or property selection change) drives the row count to 0
// and back.
export function Table({ columns, data, sortKey, sortDir, onSort, renderRow, rowKey, emptyState }) {
  return (
    <div className="table-scroll">
      <table className="table" style={{ tableLayout: "fixed" }}>
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
