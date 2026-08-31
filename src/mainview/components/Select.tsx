import { h, render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

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
//
// The popup is rendered directly into <body> with fixed positioning so it is
// not clipped by ancestor containers that use overflow: hidden/auto (e.g. the
// collapsible integration panels or the settings scroll area).
export function Select({ value, options, onChange }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const measure = (): { top: number; left: number; width: number } | null => {
    const el = btnRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.bottom + 4, left: r.left, width: r.width };
  };

  const pos = open ? measure() : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => setOpen((o) => o);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  // Render the popup through a preact render into <body> so it is not clipped.
  useEffect(() => {
    if (!open || !pos) return;
    // Keep the mount container static (no position) so it does not create a
    // stacking context. The inner popup is position: fixed with a high
    // z-index, which only works when it can participate in the root stacking
    // context; otherwise it gets trapped below higher-z siblings like the
    // settings overlay.
    const el = document.createElement("div");
    document.body.appendChild(el);
    const popup = (
      <div
        className="sel-pop"
        role="listbox"
        style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={o.value === value}
            className={`sel-opt${o.value === value ? " active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(o.value);
              setOpen(false);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
    render(popup, el);
    return () => {
      render(null, el);
      el.remove();
    };
  }, [open, pos, value, options, onChange]);

  return (
    <div className={`sel-wrap${open ? " open" : ""}`}>
      <button
        ref={btnRef}
        className="sel-btn"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <span>{options.find((o) => o.value === value)?.label ?? value}</span>
        <i className="bi bi-chevron-down" />
      </button>
    </div>
  );
}
