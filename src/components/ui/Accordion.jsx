import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export function Accordion({ children }) {
  return <div className="accordion">{children}</div>;
}

export function AccordionSection({ title, icon: IconEl, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`accordion__section ${open ? "accordion__section--open" : ""}`}>
      <button
        type="button"
        className="accordion__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="accordion__header-left">
          {IconEl && <IconEl size={16} strokeWidth={2} className="accordion__icon" />}
          <span className="accordion__title">{title}</span>
          {badge != null && badge !== "" && <span className="accordion__badge">{badge}</span>}
        </span>
        <ChevronDown size={16} strokeWidth={2} className="accordion__chevron" />
      </button>
      {open && <div className="accordion__body">{children}</div>}
    </div>
  );
}
