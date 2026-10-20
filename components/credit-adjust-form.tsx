"use client";

import { useActionState } from "react";
import { adjustCredits, type AdminFormState } from "@/lib/actions/admin";
import { buttonClass, Input, Label } from "@/components/ui";

const INITIAL: AdminFormState = { status: "idle", message: "" };

export function CreditAdjustForm({ userId, email }: { userId: string; email: string }) {
  const [state, formAction, pending] = useActionState(adjustCredits, INITIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="w-28">
        <Label htmlFor={`amount-${userId}`}>Kredit</Label>
        <div className="mt-1">
          <Input id={`amount-${userId}`} name="amount" type="number" step="0.001" placeholder="100" required />
        </div>
      </div>
      <div className="min-w-[160px] flex-1">
        <Label htmlFor={`note-${userId}`}>Alasan</Label>
        <div className="mt-1">
          <Input id={`note-${userId}`} name="note" placeholder="Top up manual" required />
        </div>
      </div>
      <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
        {pending ? "Simpan..." : "Terapkan"}
      </button>
      {state.status !== "idle" ? (
        <p className={state.status === "error" ? "w-full text-xs text-danger" : "w-full text-xs text-ok"}>
          {state.message}
        </p>
      ) : null}
      <span className="sr-only">Penyesuaian kredit untuk {email}</span>
    </form>
  );
}
