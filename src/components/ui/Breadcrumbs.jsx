import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * items: [{ label, to? }] — the last item (or any item without `to`) renders
 * as plain text; every other item is a clickable crumb.
 */
export function Breadcrumbs({ items }) {
  const navigate = useNavigate();
  // A single, non-navigable crumb only ever repeats the page's own title
  // (which the Topbar already renders as the h1) — skip it rather than
  // show a redundant one-word "trail" with nothing to navigate to.
  if (!items || items.length <= 1) return null;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="breadcrumbs__item">
              {i > 0 && <ChevronRight size={13} strokeWidth={2} className="breadcrumbs__sep" aria-hidden="true" />}
              {isLast || !item.to ? (
                <span className="breadcrumbs__current" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              ) : (
                <button type="button" className="breadcrumbs__link" onClick={() => navigate(item.to)}>
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
