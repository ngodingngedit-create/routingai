"use client";

import { useActionState } from "react";
import { requestTopUp, type TopUpState } from "@/lib/actions/billing";
import { buttonClass, Input, Label, Textarea } from "@/components/ui";

const INITIAL: TopUpState = { status: "idle", message: "" };

export function TopUpForm() {
  const [state, formAction, pending] = useActionState(requestTopUp, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <div className="sm:max-w-xs">
        <Label htmlFor="credits">Jumlah kredit</Label>
        <div className="mt-1.5">
          <Input id="credits" name="credits" type="number" min={1} step={1} placeholder="1000" required />
        </div>
      </div>
      <div className="sm:max-w-md">
        <Label htmlFor="note">Catatan untuk admin (opsional)</Label>
        <div className="mt-1.5">
          <Textarea id="note" name="note" rows={2} placeholder="Contoh: transfer via BCA a.n. ..." />
        </div>
      </div>

      {state.status === "error" ? <p className="text-xs text-danger">{state.message}</p> : null}
      {state.status === "done" ? <p className="text-xs text-ok">{state.message}</p> : null}

      <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
        {pending ? "Mengirim..." : "Ajukan top up"}
      </button>
    </form>
  );
}
