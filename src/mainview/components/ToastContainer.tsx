import { h } from "preact";

interface Toast {
  id: number;
  msg: string;
  type: string;
}

// Renders transient notifications stacked bottom-left.
export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div id="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>{toast.msg}</div>
      ))}
    </div>
  );
}
