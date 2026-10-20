"use client";

import { useActionState } from "react";
import { saveModel, type AdminFormState } from "@/lib/actions/admin";
import { buttonClass, Input, Label, Select, Textarea } from "@/components/ui";

const INITIAL: AdminFormState = { status: "idle", message: "" };

type Model = {
  id: string;
  slug: string;
  displayName: string;
  providerId: string;
  upstreamModel: string;
  priceIn: string;
  priceOut: string;
  contextWindow: number;
  maxOutput: number;
  enabled: boolean;
  description: string | null;
};

type ProviderOption = { id: string; name: string; active: boolean };

export function ModelForm({
  model,
  providers,
  mode,
}: {
  model?: Model;
  providers: ProviderOption[];
  mode: "edit" | "create";
}) {
  const [state, formAction, pending] = useActionState(saveModel, INITIAL);
  const key = model?.id ?? "new";

  return (
    <form action={formAction} className="space-y-3">
      {model ? <input type="hidden" name="id" value={model.id} /> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`slug-${key}`}>Slug (dipakai di request)</Label>
          <div className="mt-1">
            <Input id={`slug-${key}`} name="slug" defaultValue={model?.slug} placeholder="gpt-4o-mini" required />
          </div>
        </div>
        <div>
          <Label htmlFor={`displayName-${key}`}>Nama tampilan</Label>
          <div className="mt-1">
            <Input id={`displayName-${key}`} name="displayName" defaultValue={model?.displayName} required />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`providerId-${key}`}>Provider</Label>
          <div className="mt-1">
            <Select
              id={`providerId-${key}`}
              name="providerId"
              defaultValue={model?.providerId}
              options={providers.map((provider) => ({
                value: provider.id,
                label: provider.active ? provider.name : `${provider.name} (nonaktif)`,
              }))}
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`upstreamModel-${key}`}>Nama model di provider</Label>
          <div className="mt-1">
            <Input
              id={`upstreamModel-${key}`}
              name="upstreamModel"
              defaultValue={model?.upstreamModel}
              placeholder="gpt-4o-mini"
              required
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`priceIn-${key}`}>Harga input USD / 1M token</Label>
          <div className="mt-1">
            <Input
              id={`priceIn-${key}`}
              name="priceIn"
              type="number"
              step="0.000001"
              min="0"
              defaultValue={model?.priceIn ?? "0"}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`priceOut-${key}`}>Harga output USD / 1M token</Label>
          <div className="mt-1">
            <Input
              id={`priceOut-${key}`}
              name="priceOut"
              type="number"
              step="0.000001"
              min="0"
              defaultValue={model?.priceOut ?? "0"}
              required
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`contextWindow-${key}`}>Konteks maksimum</Label>
          <div className="mt-1">
            <Input
              id={`contextWindow-${key}`}
              name="contextWindow"
              type="number"
              min="0"
              defaultValue={model?.contextWindow ?? 0}
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`maxOutput-${key}`}>Output maksimum</Label>
          <div className="mt-1">
            <Input id={`maxOutput-${key}`} name="maxOutput" type="number" min="0" defaultValue={model?.maxOutput ?? 0} />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor={`description-${key}`}>Deskripsi (opsional)</Label>
        <div className="mt-1">
          <Textarea id={`description-${key}`} name="description" defaultValue={model?.description ?? ""} rows={2} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={model?.enabled}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Aktif dan tampil di katalog
      </label>

      {state.status === "error" ? <p className="text-xs text-danger">{state.message}</p> : null}
      {state.status === "done" ? <p className="text-xs text-ok">{state.message}</p> : null}

      <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
        {pending ? "Menyimpan..." : mode === "create" ? "Tambah model" : "Simpan model"}
      </button>
    </form>
  );
}
