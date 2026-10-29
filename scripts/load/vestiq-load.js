/**
 * VES-71 — load test of the main reseller flows (docs/LOAD_TEST.md).
 *
 * Each virtual user is one reseller (scripts/load/setup.mjs) who, in a loop
 * with think time: opens the dashboard, browses the network feed, opens a
 * product's inventory and the variant's movement history, and registers a
 * sale (the `confirm_sale` transaction behind "Registrar venda") before
 * looking at the sales list.
 *
 *   docker run --rm --network host -v "$PWD/scripts/load:/load" -w /load \
 *     grafana/k6:0.54.0 run vestiq-load.js
 *
 * BASE_URL (default http://localhost:3100) is the app; never production.
 */
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3100";
const VUS = Number(__ENV.VUS || 20);
const HOLD = __ENV.HOLD || "3m";
const { supabaseUrl, publishableKey, sessions } = JSON.parse(open("./.sessions.json"));
const SUPABASE_URL = __ENV.SUPABASE_URL || supabaseUrl;

const signedOut = new Rate("signed_out");

export const options = {
  scenarios: {
    resellers: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: VUS }, // ramp-up
        { duration: HOLD, target: VUS }, // expected peak
        { duration: "30s", target: 0 }, // ramp-down
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
    "http_req_duration{flow:dashboard}": ["p(95)<1000"],
    "http_req_duration{flow:rede}": ["p(95)<1000"],
    "http_req_duration{flow:inventario}": ["p(95)<1000"],
    "http_req_duration{flow:historico}": ["p(95)<1000"],
    "http_req_duration{flow:venda}": ["p(95)<1000"],
    "http_req_duration{flow:vendas}": ["p(95)<1000"],
    signed_out: ["rate==0"],
    // listed so the summary breaks the request count down per flow
    ...Object.fromEntries(
      ["dashboard", "rede", "inventario", "historico", "venda", "vendas"].map((f) => [
        `http_reqs{flow:${f}}`,
        ["count>0"],
      ]),
    ),
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

function page(path, flow, session) {
  const res = http.get(`${BASE_URL}${path}`, {
    headers: { Cookie: session.cookie },
    tags: { flow },
    redirects: 0,
  });
  // A redirect to /login means the session didn't hold — count it, don't follow it.
  signedOut.add(res.status === 307 || res.status === 303);
  check(res, { [`${flow}: 200`]: (r) => r.status === 200 });
  return res;
}

export default function resellerJourney() {
  const session = sessions[(__VU - 1) % sessions.length];

  group("dashboard", () => page("/dashboard", "dashboard", session));
  sleep(1 + Math.random() * 2);

  group("rede", () => page("/rede", "rede", session));
  sleep(1 + Math.random() * 2);

  group("inventario", () => {
    page(`/produtos/${session.productId}`, "inventario", session);
    page(
      `/produtos/${session.productId}/variantes/${session.variantId}/historico`,
      "historico",
      session,
    );
  });
  sleep(1 + Math.random() * 2);

  group("registrar venda", () => {
    const res = http.post(
      `${SUPABASE_URL}/rest/v1/rpc/confirm_sale`,
      JSON.stringify({
        p_payment_method: "PIX",
        p_items: [{ variant_id: session.variantId, quantity: 1 }],
      }),
      {
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        tags: { flow: "venda" },
      },
    );
    check(res, { "venda: 200": (r) => r.status === 200 });
    page("/vendas", "vendas", session);
  });
  sleep(1 + Math.random() * 2);
}

export function handleSummary(data) {
  return {
    "results/summary.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

/** Compact per-flow table — k6's own text summary needs a remote module. */
function textSummary(data) {
  const lines = ["", "fluxo        req     p50(ms)  p95(ms)  p99(ms)  max(ms)"];
  for (const flow of ["dashboard", "rede", "inventario", "historico", "venda", "vendas"]) {
    const m = data.metrics[`http_req_duration{flow:${flow}}`];
    const count = data.metrics[`http_reqs{flow:${flow}}`];
    if (!m) continue;
    const v = m.values;
    lines.push(
      [
        flow.padEnd(12),
        String(count ? count.values.count : "-").padStart(5),
        v.med.toFixed(0).padStart(10),
        v["p(95)"].toFixed(0).padStart(8),
        v["p(99)"].toFixed(0).padStart(8),
        v.max.toFixed(0).padStart(8),
      ].join(" "),
    );
  }
  const failed = data.metrics.http_req_failed.values.rate;
  const total = data.metrics.http_reqs.values;
  lines.push(
    "",
    `requisições: ${total.count} (${total.rate.toFixed(1)}/s) · falhas: ${(failed * 100).toFixed(2)}%`,
    `iterações: ${data.metrics.iterations.values.count} · VUs máx: ${data.metrics.vus_max.values.max}`,
    "",
  );
  for (const [name, t] of Object.entries(data.metrics)) {
    if (t.thresholds) {
      for (const [rule, r] of Object.entries(t.thresholds)) {
        lines.push(`${r.ok ? "✓" : "✗"} ${name} ${rule}`);
      }
    }
  }
  return lines.join("\n") + "\n";
}
