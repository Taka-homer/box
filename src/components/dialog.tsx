"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";
import { CloseIcon } from "./icons";

/** ネイティブの dialog 要素を使ったモーダル（フォーカス管理・Escキー対応） */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <ModalBody onClose={onClose} title={title} footer={footer}>
      {children}
    </ModalBody>
  );
}

function ModalBody({
  onClose,
  title,
  children,
  footer,
}: {
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!el.open) el.showModal();
    // 入力欄があれば、閉じるボタンではなく最初の入力欄にフォーカスする
    el.querySelector<HTMLElement>("input:not([type=file]):not([disabled]), select:not([disabled]), textarea")?.focus();
    return () => {
      if (el.open) el.close();
      previous?.focus?.();
    };
  }, []);

  // フォームの入れ子を避けるため body 直下に描画する
  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-brand-line bg-white p-0 text-body shadow-[0_12px_40px_rgb(31_45_58/0.18)]"
    >
      {(
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <h2 id={titleId} className="text-lg">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-brand-softer"
            >
              <CloseIcon size={20} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
        </div>
      )}
    </dialog>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            やめる
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {busy ? "処理中…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[15px]">{message}</div>
    </Modal>
  );
}
