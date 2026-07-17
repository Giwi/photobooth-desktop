import { h } from "preact";
import { useEffect } from "preact/hooks";

export function ClickAway({ onClick }: { onClick: () => void }) {
  useEffect(() => {
    const handler = () => onClick();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [onClick]);
  return null;
}
