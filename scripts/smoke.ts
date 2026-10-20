/**
 * Uji end to end: kunci API -> router -> provider tiruan -> pencatatan -> pemotongan saldo.
 * Jalankan: npx tsx scripts/smoke.ts
 * Butuh dev server Next.js menyala di http://localhost:3000
 */
import { createServer } from "node:http";
import { loadEnvFile } from "node:process";
import { Prisma, PrismaClient } from "@prisma/client";
import { generateApiKey, encryptSecret } from "../lib/crypto";
import { computeCostCredits } from "../lib/billing";

try {
  loadEnvFile();
} catch {
  // .env tidak ada, variabel dari shell dipakai
}

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const USER_EMAIL = "smoke@local.test";
const MODEL_SLUG = "smoke-mock-model";

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`PASS ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL ${label}`, detail ?? "");
  }
}

function startMockUpstream() {
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const parsed = JSON.parse(body || "{}");
      if (parsed.stream) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(
          `data: ${JSON.stringify({
            id: "chatcmpl-mock",
            object: "chat.completion.chunk",
            created: 1,
            model: MODEL_SLUG,
            choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
          })}\n\n`,
        );
        res.write(
          `data: ${JSON.stringify({
            id: "chatcmpl-mock",
            object: "chat.completion.chunk",
            created: 1,
            model: MODEL_SLUG,
            choices: [{ index: 0, delta: { content: "Halo" }, finish_reason: null }],
          })}\n\n`,
        );
        res.write(
          `data: ${JSON.stringify({
            id: "chatcmpl-mock",
            object: "chat.completion.chunk",
            created: 1,
            model: MODEL_SLUG,
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          })}\n\n`,
        );
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-mock",
          object: "chat.completion",
          created: 1,
          model: MODEL_SLUG,
          choices: [{ index: 0, message: { role: "assistant", content: "Halo dari mock" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      );
    });
  });

  return new Promise<{ port: number; close: () => void }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ port, close: () => server.close() });
    });
  });
}

async function main() {
  const mock = await startMockUpstream();
  const upstreamUrl = `http://127.0.0.1:${mock.port}/v1`;

  const user = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    create: { email: USER_EMAIL, name: "Smoke", emailVerified: true, credits: 1000 },
    update: { credits: 1000, status: "ACTIVE" },
  });

  const provider = await prisma.provider.upsert({
    where: { slug: "smoke-mock" },
    create: {
      slug: "smoke-mock",
      name: "Mock Upstream",
      kind: "OPENAI_COMPATIBLE",
      baseUrl: upstreamUrl,
      apiKeyEnc: encryptSecret("kunci-mock-1234567890"),
      keyMask: "7890",
      active: true,
    },
    update: { baseUrl: upstreamUrl, active: true },
  });

  await prisma.model.upsert({
    where: { slug: MODEL_SLUG },
    create: {
      slug: MODEL_SLUG,
      displayName: "Mock Model",
      providerId: provider.id,
      upstreamModel: "mock-1",
      priceIn: 0.15,
      priceOut: 0.6,
      contextWindow: 8000,
      maxOutput: 1000,
      enabled: true,
    },
    update: { providerId: provider.id, enabled: true, priceIn: 0.15, priceOut: 0.6 },
  });

  const generated = generateApiKey();
  await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: "smoke",
      prefix: generated.prefix,
      keyHash: generated.hash,
      last4: generated.last4,
      rpmLimit: 60,
    },
  });

  const authHeader = { Authorization: `Bearer ${generated.raw}`, "Content-Type": "application/json" };

  // 1. kunci salah
  const unauthorized = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: "Bearer sk-rly-tidak-ada", "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL_SLUG, messages: [{ role: "user", content: "halo" }] }),
  });
  check("kunci tidak dikenal ditolak 401", unauthorized.status === 401, unauthorized.status);

  // 2. model tidak ada
  const unknownModel = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: authHeader,
    body: JSON.stringify({ model: "tidak-ada", messages: [{ role: "user", content: "halo" }] }),
  });
  check("model tidak dikenal ditolak 404", unknownModel.status === 404, unknownModel.status);

  // 3. request normal
  const before = new Prisma.Decimal(user.credits);
  const ok = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: authHeader,
    body: JSON.stringify({ model: MODEL_SLUG, messages: [{ role: "user", content: "halo" }] }),
  });
  const okText = await ok.text();
  const okJson = JSON.parse(okText) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number };
  };
  check("request normal mengembalikan 200", ok.status === 200, okText);
  check("isi respons diteruskan", okJson.choices?.[0]?.message?.content === "Halo dari mock");
  check("usage diteruskan", okJson.usage?.prompt_tokens === 10);

  const expected = computeCostCredits({
    promptTokens: 10,
    completionTokens: 5,
    priceIn: 0.15,
    priceOut: 0.6,
    markupPercent: 0,
    creditsPerUsd: 1000,
  });
  const after = new Prisma.Decimal((await prisma.user.findUnique({ where: { id: user.id } }))!.credits);
  check(
    "saldo dipotong sesuai hitungan",
    before.minus(after).minus(expected).abs().lt(0.000001),
    { before: before.toString(), after: after.toString(), expected: expected.toString() },
  );

  const log = await prisma.requestLog.findFirst({
    where: { userId: user.id, modelSlug: MODEL_SLUG },
    orderBy: { createdAt: "desc" },
  });
  check("request tercatat di log", Boolean(log));
  check("status log OK", log?.status === "OK");
  check("token log sesuai", log?.promptTokens === 10 && log?.completionTokens === 5);
  check("token log bukan estimasi", log?.estimated === false);

  // 4. streaming
  const streamed = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: authHeader,
    body: JSON.stringify({
      model: MODEL_SLUG,
      messages: [{ role: "user", content: "halo" }],
      stream: true,
    }),
  });
  const text = await streamed.text();
  check("stream mengembalikan 200", streamed.status === 200, streamed.status);
  check("stream berisi chunk konten", text.includes('"content":"Halo"'));
  check("stream ditutup dengan [DONE]", text.includes("data: [DONE]"));

  await new Promise((resolve) => setTimeout(resolve, 400));
  const streamLog = await prisma.requestLog.findFirst({
    where: { userId: user.id, modelSlug: MODEL_SLUG, streaming: true },
    orderBy: { createdAt: "desc" },
  });
  check("stream tercatat dengan token dari usage", streamLog?.promptTokens === 10, streamLog?.promptTokens);

  // 5. daftar model
  const models = await fetch(`${BASE_URL}/v1/models`, { headers: authHeader });
  const modelsJson = (await models.json()) as { data?: { id: string }[] };
  check("daftar model memuat model aktif", Boolean(modelsJson.data?.some((item) => item.id === MODEL_SLUG)));

  // 6. laporan pemakaian
  const usage = await fetch(`${BASE_URL}/v1/usage`, { headers: authHeader });
  const usageJson = (await usage.json()) as { by_model?: { model: string; requests: number }[] };
  check("laporan pemakaian ada", usage.status === 200);
  check(
    "laporan pemakaian menghitung model",
    Boolean(usageJson.by_model?.some((item) => item.model === MODEL_SLUG && item.requests >= 2)),
    usageJson.by_model,
  );

  // bersihkan data uji
  await prisma.requestLog.deleteMany({ where: { userId: user.id } });
  await prisma.apiKey.deleteMany({ where: { userId: user.id } });
  await prisma.model.deleteMany({ where: { slug: MODEL_SLUG } });
  await prisma.provider.deleteMany({ where: { slug: "smoke-mock" } });
  await prisma.creditTx.deleteMany({ where: { userId: user.id } });
  await prisma.user.deleteMany({ where: { email: USER_EMAIL } });
  mock.close();

  console.log(failures === 0 ? "\nSEMUA CEK LULUS" : `\n${failures} CEK GAGAL`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
