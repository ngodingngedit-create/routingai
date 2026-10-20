"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ModelRow = {
  slug: string;
  displayName: string;
  provider: string;
  contextWindow: number;
  priceIn: string;
  priceOut: string;
};

export function ModelTable({ models }: { models: ModelRow[] }) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");

  const providers = useMemo(
    () => Array.from(new Set(models.map((model) => model.provider))),
    [models],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return models.filter((model) => {
      const matchesProvider = provider === "all" || model.provider === provider;
      const matchesQuery =
        needle === "" ||
        model.slug.toLowerCase().includes(needle) ||
        model.displayName.toLowerCase().includes(needle);
      return matchesProvider && matchesQuery;
    });
  }, [models, provider, query]);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari model"
          aria-label="Cari model"
          className="h-9 w-full max-w-xs rounded-[6px] border border-line bg-surface px-3 text-sm text-text placeholder:text-muted/70 focus:border-accent focus:outline-none"
        />
        {providers.length > 1 ? (
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            aria-label="Saring berdasarkan provider"
            className="h-9 rounded-[6px] border border-line bg-surface px-3 text-sm text-text focus:border-accent focus:outline-none"
          >
            <option value="all">Semua provider</option>
            {providers.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        ) : null}
        <p className="text-xs text-muted" aria-live="polite">
          {filtered.length} dari {models.length} model
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-[10px] border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Model
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Provider
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Konteks
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Input / 1M
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Output / 1M
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-sm text-muted">
                  Tidak ada model yang cocok dengan filter ini. Hapus kata kunci atau pilih provider lain.
                </td>
              </tr>
            ) : (
              filtered.map((model) => (
                <tr key={model.slug}>
                  <td className="px-4 py-3">
                    <Link href={`/models/${model.slug}`} className="font-mono text-sm text-text hover:text-accent">
                      {model.slug}
                    </Link>
                    <p className="text-xs text-muted">{model.displayName}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{model.provider}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {model.contextWindow > 0 ? model.contextWindow.toLocaleString("id-ID") : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{model.priceIn}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{model.priceOut}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
