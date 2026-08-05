import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ClickAway } from "./ClickAway";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

// Custom select dropdown. The native <select> popup on Linux is a GTK menu
// that ignores CSS, so it renders light even in dark themes. This replaces it
// with a styled popup that follows the theme variables.
export function Select({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`sel-wrap${open ? " open" : ""}`}>
      <button className="sel-btn" type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
        <span>{options.find((o) => o.value === value)?.label ?? value}</span>
        <i className="bi bi-chevron-down" />
      </button>
      {open && (
        <div className="sel-pop" role="listbox">
          {options.map((o) => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === value}
              className={`sel-opt${o.value === value ? " active" : ""}`}
              onClick={(e) => { e.stopPropagation(); onChange(o.value); setOpen(false); }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
      {open && <ClickAway onClick={() => setOpen(false)} />}
    </div>
  );
}
