"use client";

import Link from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";
import { AlertIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, InfoIcon } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brand-strong text-white border border-brand-strong hover:bg-brand-deep disabled:bg-brand-line disabled:border-brand-line disabled:text-white",
  secondary:
    "bg-white text-brand-strong border border-brand hover:bg-brand-soft disabled:text-muted disabled:border-line",
  ghost: "bg-transparent text-brand-strong border border-transparent hover:bg-brand-soft disabled:text-muted",
  danger:
    "bg-white text-danger border border-danger-line hover:bg-danger-soft disabled:text-muted disabled:border-line",
};

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[15px] font-medium transition-colors disabled:cursor-not-allowed select-none";

export function Button({
  variant = "secondary",
  className = "",
  type = "button",
  ...rest
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type={type} className={`${BASE} ${VARIANT[variant]} ${className}`} {...rest} />;
}

export function LinkButton({
  variant = "secondary",
  className = "",
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${BASE} ${VARIANT[variant]} ${className}`} {...rest} />;
}

export function Card({ className = "", ...rest }: ComponentProps<"div">) {
  return <div className={`rounded-2xl border border-brand-line bg-white p-4 sm:p-5 ${className}`} {...rest} />;
}

export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm text-brand-strong hover:underline"
        >
          <ChevronLeftIcon size={18} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] sm:text-2xl break-words">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg">{children}</h2>
      {aside}
    </div>
  );
}

/** ラベル・補足・エラーをまとめた入力欄の枠 */
export function Field({
  label,
  required,
  help,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  help?: ReactNode;
  error?: string | null;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-2 rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-normal text-brand-strong">必須</span>
        ) : (
          <span className="ml-2 text-xs font-normal text-muted">任意</span>
        )}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {help && (
        <p id={helpId} className="text-[13px] text-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-[13px] text-danger">
          <AlertIcon size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full min-h-12 rounded-xl border border-brand-line bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-[#8796a2] focus:border-brand-strong focus:outline-none focus-visible:outline-2 aria-[invalid=true]:border-danger disabled:bg-brand-softer disabled:text-muted";

export function TextInput(props: ComponentProps<"input">) {
  return <input type="text" {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function TextArea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select {...props} className={`${inputClass} appearance-none pr-10 ${className}`} />
      <ChevronDownIcon
        size={20}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brand-strong"
      />
    </div>
  );
}

/** 保存結果などのお知らせ。読み上げにも伝わる */
export function Notice({
  kind,
  children,
  className = "",
}: {
  kind: "success" | "error" | "info" | "warn";
  children: ReactNode;
  className?: string;
}) {
  const style = {
    success: "border-ok-line bg-ok-soft text-ok",
    error: "border-danger-line bg-danger-soft text-danger",
    info: "border-brand-line bg-brand-softer text-body",
    warn: "border-warn-line bg-warn-soft text-warn",
  }[kind];
  const Icon = kind === "success" ? CheckIcon : kind === "info" ? InfoIcon : AlertIcon;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-[14px] ${style} ${className}`}
    >
      <Icon size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-brand-line bg-brand-softer px-5 py-8 text-center">
      {icon && <div className="mb-3 text-brand">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Loading({ label = "読み込み中…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-sm text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-line border-t-brand-strong" />
      {label}
    </div>
  );
}

export function LoadError() {
  return (
    <Notice kind="error">
      データを読み込めませんでした。ページを再読み込みしてください。プライベートブラウズでは保存できない場合があります。
    </Notice>
  );
}

export function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "warn" | "muted" }) {
  const style = {
    brand: "bg-brand-soft text-brand-strong",
    warn: "bg-warn-soft text-warn border border-warn-line",
    muted: "bg-[#f1f4f6] text-muted",
  }[tone];
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${style}`}>{children}</span>;
}
