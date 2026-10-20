"use client";

import { useActionState } from "react";
import { saveSettings, type AdminFormState } from "@/lib/actions/admin";
import { buttonClass, Input, Label } from "@/components/ui";

const INITIAL: AdminFormState = { status: "idle", message: "" };

export function SettingsForm({ settings }: { settings: Record<string, string> }) {
  const [state, formAction, pending] = useActionState(saveSettings, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="signupCredits">Kredit awal daftar</Label>
          <div className="mt-1">
            <Input id="signupCredits" name="signupCredits" type="number" step="1" min="0" defaultValue={settings.signupCredits} />
          </div>
        </div>
        <div>
          <Label htmlFor="creditsPerUsd">Kredit per 1 USD</Label>
          <div className="mt-1">
            <Input id="creditsPerUsd" name="creditsPerUsd" type="number" step="1" min="1" defaultValue={settings.creditsPerUsd} />
          </div>
        </div>
        <div>
          <Label htmlFor="markupPercent">Margin persen</Label>
          <div className="mt-1">
            <Input id="markupPercent" name="markupPercent" type="number" step="0.1" min="0" defaultValue={settings.markupPercent} />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="allowedEmailDomains">Domain email yang boleh daftar</Label>
        <div className="mt-1">
          <Input
            id="allowedEmailDomains"
            name="allowedEmailDomains"
            defaultValue={settings.allowedEmailDomains}
            placeholder="Kosongkan untuk semua domain, isi daftar dipisah koma"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="maintenanceMode"
          defaultChecked={settings.maintenanceMode === "true"}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Tutup pendaftaran (mode maintenance)
      </label>

      {state.status === "error" ? <p className="text-xs text-danger">{state.message}</p> : null}
      {state.status === "done" ? <p className="text-xs text-ok">{state.message}</p> : null}

      <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
        {pending ? "Menyimpan..." : "Simpan pengaturan"}
      </button>
    </form>
  );
}
