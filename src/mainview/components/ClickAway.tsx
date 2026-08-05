import { h } from "preact";
import { useEffect } from "preact/hooks";

// Utility component: fires onClick when the user clicks anywhere on the
// document (used to close popups). Renders nothing.
export function ClickAway({ onClick }: { onClick: () => void }) {
  useEffect(() => {
    const handler = () => onClick();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [onClick]);
  return null;
}
