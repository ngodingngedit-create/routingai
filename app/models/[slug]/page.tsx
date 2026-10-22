import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { decodeSlugParam } from "@/lib/slug";
import { getApiBaseUrl } from "@/lib/public-url";
import { formatEffectivePrice, formatUsdPerMillion } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { buttonClass, Code } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const model = await prisma.model.findUnique({ where: { slug }, select: { displayName: true } });
  return { title: model ? model.displayName : "Model" };
}

export default async function ModelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const [model, baseUrl, settings] = await Promise.all([
    prisma.model.findUnique({
      where: { slug },
      include: { provider: true },
    }),
    getApiBaseUrl(),
    getSettings(),
  ]);

  if (!model || !model.enabled || !model.provider.active) notFound();

  const markupPercent = Number(settings.markupPercent);

  const capabilities = (model.capabilities ?? {}) as Record<string, unknown>;
  const capabilityRows: [string, boolean][] = [
    ["Streaming", Boolean(capabilities.streaming ?? true)],
    ["Tool calling", Boolean(capabilities.tools)],
    ["Input gambar", Boolean(capabilities.vision)],
  ];

  const sample = `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer sk-rly-..." \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${model.slug}", "messages": [{"role": "user", "content": "Halo"}]}'`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <p className="text-xs text-muted">
        <Link href="/models" className="hover:text-text">
          Katalog model
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="font-mono">{model.slug}</span>
      </p>

      <h1 className="mt-3 font-mono text-2xl font-semibold tracking-tight text-text">{model.slug}</h1>
      <p className="mt-1 text-sm text-muted">
        {model.displayName}, dilayani oleh {model.provider.name}.
      </p>

      {model.description ? (
        <p className="mt-4 max-w-2xl text-sm text-muted">{model.description}</p>
      ) : null}

      <div className="mt-8 grid gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-2">
        <div className="bg-surface px-4 py-4">
          <p className="text-xs text-muted">Harga input per 1M token</p>
          <p className="mt-1 font-mono text-lg text-text">
            {formatEffectivePrice(model.priceIn, markupPercent)}
          </p>
          {markupPercent > 0 ? (
            <p className="mt-0.5 text-xs text-muted">
              harga provider {formatUsdPerMillion(model.priceIn)} + margin {markupPercent}%
            </p>
          ) : null}
        </div>
        <div className="bg-surface px-4 py-4">
          <p className="text-xs text-muted">Harga output per 1M token</p>
          <p className="mt-1 font-mono text-lg text-text">
            {formatEffectivePrice(model.priceOut, markupPercent)}
          </p>
          {markupPercent > 0 ? (
            <p className="mt-0.5 text-xs text-muted">
              harga provider {formatUsdPerMillion(model.priceOut)} + margin {markupPercent}%
            </p>
          ) : null}
        </div>
        <div className="bg-surface px-4 py-4">
          <p className="text-xs text-muted">Konteks maksimum</p>
          <p className="mt-1 font-mono text-lg text-text">
            {model.contextWindow > 0 ? model.contextWindow.toLocaleString("id-ID") : "Belum diisi"}
          </p>
        </div>
        <div className="bg-surface px-4 py-4">
          <p className="text-xs text-muted">Output maksimum</p>
          <p className="mt-1 font-mono text-lg text-text">
            {model.maxOutput > 0 ? model.maxOutput.toLocaleString("id-ID") : "Belum diisi"}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-text">Kemampuan</h2>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {capabilityRows.map(([label, enabled]) => (
            <li key={label} className={enabled ? "text-text" : "text-muted"}>
              {enabled ? "Ada" : "Belum"}: {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-text">Contoh pakai</h2>
        <pre className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-surface px-4 py-3 font-mono text-[12.5px] leading-relaxed text-text">
          {sample}
        </pre>
        <p className="mt-3 text-sm text-muted">
          Ganti <Code>model</Code> dengan slug lain dari katalog untuk berpindah provider atau model.
        </p>
      </div>

      <div className="mt-10">
        <Link href="/docs" className={buttonClass("outline", "md")}>
          Panduan lengkap
        </Link>
      </div>
    </div>
  );
}
