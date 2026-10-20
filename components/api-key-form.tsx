"use client";

import { useActionState } from "react";
import { createApiKey, type KeyFormState } from "@/lib/actions/keys";
import { CopyButton } from "@/components/copy-button";
import { buttonClass, Input, Label } from "@/components/ui";

const INITIAL: KeyFormState = { status: "idle", message: "" };

export function ApiKeyForm() {
  const [state, formAction, pending] = useActionState(createApiKey, INITIAL);

  if (state.status === "created" && state.plainKey) {
    return (
      <div className="rounded-[10px] border border-accent bg-accent-soft p-4">
        <p className="text-sm font-medium text-text">{`Kunci "${state.createdName}" siap dipakai`}</p>
        <p className="mt-1 text-sm text-muted">{state.message}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-[6px] border border-line bg-surface px-3 py-2 font-mono text-xs text-text">
            {state.plainKey}
          </code>
          <CopyButton value={state.plainKey} />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem]">
        <div>
          <Label htmlFor="name">Nama kunci</Label>
          <div className="mt-1.5">
            <Input id="name" name="name" placeholder="Contoh: aplikasi web" required maxLength={60} />
          </div>
        </div>
        <div>
          <Label htmlFor="rpm">Limit per menit</Label>
          <div className="mt-1.5">
            <Input id="rpm" name="rpm" type="number" defaultValue={60} min={1} max={600} required />
          </div>
        </div>
      </div>

      {state.status === "error" ? <p className="text-xs text-danger">{state.message}</p> : null}

      <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
        {pending ? "Membuat kunci..." : "Buat kunci API"}
      </button>
    </form>
  );
}
