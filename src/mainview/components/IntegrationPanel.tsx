import { h } from "preact";

export interface Field {
  id: string;
  label: string;
  type?: "text" | "password" | "number" | "checkbox";
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export function IntegrationPanel({
  icon,
  title,
  open,
  onToggle,
  enabled,
  onToggleEnabled,
  fields,
  values,
  onChange,
  onAuthorize,
  authorized,
  footer,
  t,
}: {
  icon?: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  enabled?: boolean;
  onToggleEnabled?: (v: boolean) => void;
  fields?: Field[];
  values?: Record<string, any>;
  onChange?: (id: string, v: any) => void;
  onAuthorize?: () => void;
  authorized?: boolean;
  footer?: any;
  t: (k: string) => string;
}) {
  const fieldsEl = fields
    ? fields.map((f) => (
        <div className="integ-field" key={f.id}>
          <label htmlFor={f.id}>{f.label}</label>
          {f.type === "checkbox" ? (
            <input
              id={f.id}
              type="checkbox"
              checked={!!values?.[f.id]}
              onChange={(e) => onChange?.(f.id, (e.target as HTMLInputElement).checked)}
            />
          ) : f.options ? (
            <select
              id={f.id}
              value={values?.[f.id] || ""}
              onChange={(e) => onChange?.(f.id, (e.target as HTMLSelectElement).value)}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={f.id}
              type={f.type || "text"}
              placeholder={f.placeholder}
              value={values?.[f.id] ?? ""}
              onChange={(e) => onChange?.(f.id, (e.target as HTMLInputElement).value)}
            />
          )}
        </div>
      ))
    : null;

  return (
    <div className="integ-panel">
      <button className={`integ-header${open ? " open" : ""}`} onClick={onToggle}>
        {icon && <img src={icon} className="integ-icon" alt={title} />}
        <span className="integ-title">{title}</span>
        {enabled !== undefined && onToggleEnabled && (
          <label className="integ-enabled" onClick={(e) => e.stopPropagation()} title={t("settings.integrationEnabled")}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggleEnabled((e.target as HTMLInputElement).checked)}
            />
          </label>
        )}
        <i className={`bi integ-caret${open ? " bi-chevron-up" : " bi-chevron-down"}`} />
      </button>
      {open && (
        <div className="integ-body">
          {fieldsEl}
          {onAuthorize && (
            <button className="integ-auth" onClick={onAuthorize}>
              {authorized ? t("settings.integrationReauthorize") : t("settings.integrationAuthorize")}
            </button>
          )}
          {footer}
        </div>
      )}
    </div>
  );
}
