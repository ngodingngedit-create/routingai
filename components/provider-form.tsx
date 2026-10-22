"use client";

import { useActionState } from "react";
import { saveProvider, type AdminFormState } from "@/lib/actions/admin";
import { buttonClass, Input, Label, Select } from "@/components/ui";

const INITIAL: AdminFormState = { status: "idle", message: "" };

type Provider = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  baseUrl: string;
  keyMask: string;
  active: boolean;
};

export function ProviderForm({ provider, mode }: { provider?: Provider; mode: "edit" | "create" }) {
  const [state, formAction, pending] = useActionState(saveProvider, INITIAL);

  return (
    <form action={formAction} className="space-y-3">
      {provider ? <input type="hidden" name="id" value={provider.id} /> : null}

      {mode === "create" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`slug-${provider?.id ?? "new"}`}>Slug</Label>
            <div className="mt-1">
              <Input id={`slug-${provider?.id ?? "new"}`} name="slug" placeholder="groq" required />
            </div>
          </div>
          <div>
            <Label htmlFor={`kind-${provider?.id ?? "new"}`}>Jenis</Label>
            <div className="mt-1">
              <Select
                id={`kind-${provider?.id ?? "new"}`}
                name="kind"
                defaultValue="OPENAI_COMPATIBLE"
                options={[
                  { value: "OPENAI_COMPATIBLE", label: "OpenAI compatible" },
                  { value: "OPENROUTER", label: "OpenRouter" },
                  { value: "ANTHROPIC", label: "Anthropic" },
                  { value: "GEMINI", label: "Gemini" },
                ]}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <Label htmlFor={`name-${provider?.id ?? "new"}`}>Nama</Label>
        <div className="mt-1">
          <Input
            id={`name-${provider?.id ?? "new"}`}
            name="name"
            defaultValue={provider?.name}
            placeholder="Groq"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`baseUrl-${provider?.id ?? "new"}`}>Base URL</Label>
        <div className="mt-1">
          <Input
            id={`baseUrl-${provider?.id ?? "new"}`}
            name="baseUrl"
            defaultValue={provider?.baseUrl}
            placeholder="https://api.groq.com/openai/v1"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`apiKey-${provider?.id ?? "new"}`}>
          Kunci API provider {provider?.keyMask ? `(tersimpan ${provider.keyMask})` : ""}
        </Label>
        <div className="mt-1">
          <Input
            id={`apiKey-${provider?.id ?? "new"}`}
            name="apiKey"
            type="password"
            placeholder={provider?.keyMask ? "Kosongkan kalau tidak diganti" : "sk-..."}
            autoComplete="off"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" name="active" defaultChecked={provider?.active} className="h-4 w-4 accent-[var(--accent)]" />
        Aktif dan bisa dipakai (kunci API wajib sudah terisi)
      </label>

      {state.status === "error" ? <p className="text-xs text-danger">{state.message}</p> : null}
      {state.status === "done" ? <p className="text-xs text-ok">{state.message}</p> : null}

      <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
        {pending ? "Menyimpan..." : mode === "create" ? "Tambah provider" : "Simpan provider"}
      </button>
    </form>
  );
}
