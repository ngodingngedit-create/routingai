"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { buttonClass, Card, CardHeader, Input, Label, Select, Textarea } from "@/components/ui";

type Model = {
  slug: string;
  displayName: string;
  provider: string;
  priceIn: string;
  priceOut: string;
  contextWindow: number;
};

type ErrorInfo = { code: string; message: string; hint: string };

type Meta = {
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  credits?: string;
  balance?: string;
  latencyMs?: number;
  ownerOther?: boolean;
};

const HINTS: Record<string, string> = {
  missing_api_key: "Kunci API tidak dikirim. Tempel kunci yang dibuat di panel Kunci API.",
  invalid_api_key:
    "Kunci tidak dikenal. Cek salinannya, termasuk prefix sk-rly- dan karakter yang terpotong.",
  key_revoked: "Kunci ini sudah dicabut. Buat kunci baru di panel Kunci API.",
  key_expired: "Kunci ini sudah kedaluwarsa. Buat kunci baru di panel Kunci API.",
  account_suspended: "Akun pemilik kunci sedang dinonaktifkan. Hubungi admin.",
  insufficient_credits: "Saldo tidak cukup untuk request ini.",
  rate_limited: "Batas permintaan per menit kunci ini terlampaui. Tunggu sebentar lalu ulangi.",
  model_not_found: "Model ini tidak ada atau sedang dinonaktifkan. Pilih model lain.",
  provider_inactive: "Provider model ini sedang dinonaktifkan oleh admin.",
  provider_not_configured: "Admin belum mengisi kredensial provider untuk model ini.",
  model_price_missing: "Harga model ini belum diatur oleh admin, jadi belum bisa dipakai.",
  invalid_request: "Permintaan tidak sesuai format chat completion.",
  unauthorized: "Sesi kamu habis. Masuk ulang lalu ulangi.",
  upstream_error: "Provider menolak request ini. Lihat detail di bawah.",
};

type StreamChunk = {
  choices?: { delta?: { content?: string; reasoning?: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    credits_charged?: string;
    balance_credits?: string;
  };
};

export function PlaygroundForm({ models }: { models: Model[] }) {
  const [apiKey, setApiKey] = useState("");
  const [revealKey, setRevealKey] = useState(false);
  const [model, setModel] = useState(models[0]?.slug ?? "");
  const [prompt, setPrompt] = useState("Halo, jawab singkat.");
  const [maxTokens, setMaxTokens] = useState(300);
  const [temperature, setTemperature] = useState("");

  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [answer, setAnswer] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const selected = models.find((item) => item.slug === model);

  const send = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = Date.now();

    setStatus("sending");
    setAnswer("");
    setReasoning("");
    setError(null);
    setMeta({ model });

    try {
      const response = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature.trim() === "" ? undefined : Number(temperature),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { code?: string; message?: string } }
          | null;
        const code = body?.error?.code ?? "unknown_error";
        setError({
          code,
          message: body?.error?.message ?? `Request gagal dengan status ${response.status}.`,
          hint: HINTS[code] ?? "Lihat detail respons di bawah.",
        });
        setStatus("error");
        return;
      }

      const ownerOther = response.headers.get("x-routingai-key-owner") === "other";
      const reader = response.body?.getReader();
      if (!reader) {
        setError({
          code: "no_stream",
          message: "Respons tidak punya body.",
          hint: "Coba ulangi request.",
        });
        setStatus("error");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          for (const line of block.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            let chunk: StreamChunk;
            try {
              chunk = JSON.parse(data) as StreamChunk;
            } catch {
              continue;
            }

            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) setAnswer((value) => value + delta.content);
            if (delta?.reasoning) setReasoning((value) => value + delta.reasoning);
            const usage = chunk.usage;
            if (usage) {
              setMeta((current) => ({
                ...(current ?? { model }),
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
                credits: usage.credits_charged,
                balance: usage.balance_credits,
                latencyMs: Date.now() - startedAt,
                ownerOther,
              }));
            }
          }
        }
      }

      setMeta((current) => ({
        ...(current ?? { model }),
        latencyMs: Date.now() - startedAt,
        ownerOther,
      }));
      setStatus("done");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError({
        code: "network_error",
        message: caught instanceof Error ? caught.message : "Request gagal.",
        hint: "Coba ulangi beberapa saat lagi.",
      });
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Kunci API" description="Kunci yang mau diuji. Nyalanya hanya di server." />
          <div className="space-y-3 p-4">
            <div>
              <Label htmlFor="pg-key">Kunci API</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="pg-key"
                  name="apiKey"
                  type={revealKey ? "text" : "password"}
                  placeholder="sk-rly-..."
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setRevealKey((value) => !value)}
                  className={buttonClass("outline", "md")}
                >
                  {revealKey ? "Sembunyikan" : "Lihat"}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Kunci tidak pernah disimpan di server. Yang tersimpan di database cuma hash-nya.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Request" description="Body yang dikirim, sama seperti panggilan API biasa." />
          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="pg-model">Model</Label>
              <div className="mt-1.5">
                <Select
                  id="pg-model"
                  name="model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  options={models.map((item) => ({
                    value: item.slug,
                    label: `${item.slug} · ${item.provider}`,
                  }))}
                />
              </div>
              {selected ? (
                <p className="mt-1.5 text-xs text-muted">
                  {selected.priceIn} / {selected.priceOut} per 1M token
                  {selected.contextWindow > 0
                    ? ` · konteks ${selected.contextWindow.toLocaleString("id-ID")} token`
                    : ""}
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="pg-prompt">Prompt</Label>
              <div className="mt-1.5">
                <Textarea
                  id="pg-prompt"
                  name="prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={5}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="pg-max">max_tokens</Label>
                <div className="mt-1.5">
                  <Input
                    id="pg-max"
                    name="max_tokens"
                    type="number"
                    min={1}
                    max={32000}
                    value={maxTokens}
                    onChange={(event) => setMaxTokens(Number(event.target.value))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pg-temp">temperature (opsional)</Label>
                <div className="mt-1.5">
                  <Input
                    id="pg-temp"
                    name="temperature"
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    placeholder="default provider"
                    value={temperature}
                    onChange={(event) => setTemperature(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={send}
                disabled={status === "sending" || apiKey.trim().length < 12 || prompt.trim().length === 0}
                className={buttonClass("primary", "md")}
              >
                {status === "sending" ? "Mengirim..." : "Kirim request"}
              </button>
              {status === "sending" ? (
                <button type="button" onClick={cancel} className={buttonClass("outline", "md")}>
                  Batalkan
                </button>
              ) : null}
            </div>
            {apiKey.trim().length < 12 ? (
              <p className="text-xs text-muted">Tempel kunci API dulu supaya request bisa dikirim.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader
          title="Respons"
          description="Jawaban streamed dari provider, lengkap dengan token dan kredit terpakai."
        />
        <div className="p-4" aria-live="polite">
          {status === "idle" ? (
            <div className="rounded-[6px] border border-line bg-surface-2 px-4 py-8 text-center">
              <p className="text-sm font-medium text-text">Belum ada request</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Tempel kunci API, pilih model, lalu kirim request untuk memastikan kuncimu bekerja.
              </p>
            </div>
          ) : null}

          {status === "sending" ? (
            <div className="rounded-[6px] border border-line bg-surface-2 px-4 py-8 text-center">
              <p className="text-sm font-medium text-text">Mengirim ke {model}</p>
              <p className="mt-1 text-sm text-muted">Menunggu token pertama dari provider.</p>
            </div>
          ) : null}

          {status === "error" && error ? (
            <div className="rounded-[6px] border border-line bg-surface-2 px-4 py-4">
              <p className="font-mono text-xs text-danger">{error.code}</p>
              <p className="mt-1 text-sm text-text">{error.message}</p>
              <p className="mt-1 text-sm text-muted">{error.hint}</p>
              {error.code === "insufficient_credits" ? (
                <Link href="/dashboard/billing" className="mt-3 inline-block text-sm underline underline-offset-2">
                  Isi saldo
                </Link>
              ) : null}
            </div>
          ) : null}

          {status === "done" ? (
            <div className="space-y-4">
              {meta?.ownerOther ? (
                <p className="rounded-[6px] border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
                  Kunci ini milik akun lain, jadi kreditnya kepotong dari saldo akun itu.
                </p>
              ) : null}

              {reasoning ? (
                <div className="rounded-[6px] border border-line bg-surface-2 px-3 py-2">
                  <p className="text-xs text-muted">Reasoning model</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted">{reasoning}</p>
                </div>
              ) : null}

              <div className="whitespace-pre-wrap rounded-[6px] border border-line bg-surface-2 px-4 py-3 text-sm text-text">
                {answer || <span className="text-muted">Model tidak mengirim teks jawaban.</span>}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-muted">Model</dt>
                  <dd className="mt-0.5 font-mono text-text">{meta?.model}</dd>
                </div>
                <div>
                  <dt className="text-muted">Token</dt>
                  <dd className="mt-0.5 font-mono text-text">
                    {meta?.promptTokens ?? "-"} / {meta?.completionTokens ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Kredit terpakai</dt>
                  <dd className="mt-0.5 font-mono text-text">{meta?.credits ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Sisa saldo</dt>
                  <dd className="mt-0.5 font-mono text-text">{meta?.balance ?? "-"}</dd>
                </div>
              </dl>

              {meta?.latencyMs ? (
                <p className="text-xs text-muted">Durasi {meta.latencyMs} ms. Credit juga tercatat di halaman Pemakaian.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
