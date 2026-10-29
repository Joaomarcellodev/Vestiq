/**
 * VES-71 / VES-72 — what one reseller does in the load and stress tests
 * (docs/LOAD_TEST.md, docs/STRESS_TEST.md), shared by both k6 scripts.
 */
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate } from "k6/metrics";

export const BASE_URL = __ENV.BASE_URL || "http://localhost:3100";
const { supabaseUrl, publishableKey, sessions } = JSON.parse(open("./.sessions.json"));
const SUPABASE_URL = __ENV.SUPABASE_URL || supabaseUrl;
/** A request a user would give up on counts as a failure, not as a 60 s wait. */
const TIMEOUT = __ENV.REQUEST_TIMEOUT || "10s";

export const FLOWS = ["dashboard", "rede", "inventario", "historico", "venda", "vendas"];

const signedOut = new Rate("signed_out");

/** Request counts per flow show up in the summary only when a threshold names them. */
export const PER_FLOW_COUNTS = Object.fromEntries(
  FLOWS.map((f) => [`http_reqs{flow:${f}}`, ["count>0"]]),
);

function page(path, flow, session) {
  const res = http.get(`${BASE_URL}${path}`, {
    headers: { Cookie: session.cookie },
    tags: { flow },
    redirects: 0,
    timeout: TIMEOUT,
  });
  // A redirect to /login means the session didn't hold — count it, don't follow it.
  signedOut.add(res.status === 307 || res.status === 303);
  check(res, { [`${flow}: 200`]: (r) => r.status === 200 });
  return res;
}

export function resellerJourney() {
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
        timeout: TIMEOUT,
      },
    );
    check(res, { "venda: 200": (r) => r.status === 200 });
    page("/vendas", "vendas", session);
  });
  sleep(1 + Math.random() * 2);
}

/** Compact per-flow table — k6's own text summary needs a remote module. */
export function textSummary(data) {
  const lines = ["", "fluxo        req     p50(ms)  p95(ms)  p99(ms)  max(ms)"];
  for (const flow of FLOWS) {
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
