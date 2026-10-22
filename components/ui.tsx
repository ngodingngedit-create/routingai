import type { ChangeEvent, ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Memilih antara mode controlled (value) dan uncontrolled (defaultValue). */
function fieldValue(
  value: string | number | undefined,
  defaultValue: string | number | undefined,
): { value?: string | number; defaultValue?: string | number } {
  return value === undefined ? { defaultValue } : { value };
}

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" = "md") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[6px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
  };
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-accent text-on-accent hover:bg-accent-strong",
    outline: "border border-line text-text hover:border-line-strong hover:bg-surface-2",
    ghost: "text-muted hover:bg-surface-2 hover:text-text",
    danger: "border border-line text-danger hover:bg-surface-2 hover:border-danger",
  };
  return cn(base, sizes[size], variants[variant]);
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[10px] border border-line bg-surface", className)}>{children}</section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-muted">
      {children}
    </label>
  );
}

export function Input({
  id,
  name,
  type = "text",
  placeholder,
  defaultValue,
  value,
  onChange,
  required,
  min,
  max,
  step,
  maxLength,
  autoComplete,
}: {
  id: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string | number;
  value?: string | number;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      {...fieldValue(value, defaultValue)}
      onChange={onChange}
      required={required}
      min={min}
      max={max}
      step={step}
      maxLength={maxLength}
      autoComplete={autoComplete}
      className="h-10 w-full rounded-[6px] border border-line bg-bg px-3 text-sm text-text placeholder:text-muted/70 focus:border-accent focus:outline-none"
    />
  );
}

export function Textarea({
  id,
  name,
  placeholder,
  defaultValue,
  value,
  onChange,
  rows = 3,
  required,
}: {
  id: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <textarea
      id={id}
      name={name}
      placeholder={placeholder}
      {...fieldValue(value, defaultValue)}
      onChange={onChange}
      rows={rows}
      required={required}
      className="w-full rounded-[6px] border border-line bg-bg px-3 py-2 text-sm text-text placeholder:text-muted/70 focus:border-accent focus:outline-none"
    />
  );
}

export function Select({
  id,
  name,
  defaultValue,
  value,
  onChange,
  options,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id}
      name={name}
      {...fieldValue(value, defaultValue)}
      onChange={onChange}
      className="h-10 w-full rounded-[6px] border border-line bg-bg px-3 text-sm text-text focus:border-accent focus:outline-none"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "text-ok",
  OK: "text-ok",
  PAID: "text-ok",
  AKTIF: "text-ok",
  SUSPENDED: "text-danger",
  REVOKED: "text-danger",
  REJECTED: "text-danger",
  UPSTREAM_ERROR: "text-danger",
  PENDING: "text-muted",
  NONAKTIF: "text-muted",
};

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  return (
    <span className={cn("text-xs font-medium", STATUS_STYLES[value] ?? "text-muted")}>
      {label ?? value}
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[4px] border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] text-text">
      {children}
    </code>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 px-4 py-10">
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="max-w-md text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}

export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
