/**
 * VES-72 — stress test (docs/STRESS_TEST.md): the same reseller journey as the
 * load test, with the number of users climbing in steps until the system
 * breaks, then dropping back to a light load to check that it recovers alone.
 *
 *   docker run --rm --network host -v "$PWD/scripts/load:/load" -w /load \
 *     grafana/k6:0.54.0 run --out csv=results/stress.csv vestiq-stress.js
 *
 * The thresholds mark where it breaks (RNF-PERF-001: p95 < 2 s; < 5% errors)
 * but don't abort the run — the recovery phase is part of the test.
 * `node scripts/load/stress-report.mjs` turns the CSV into the per-step table.
 */
import { FLOWS, PER_FLOW_COUNTS, resellerJourney, textSummary } from "./journey.js";

/** Users per step; each step ramps for 1 min and holds for 1 min. */
const STEPS = (__ENV.STEPS || "25,50,100,150,200,300").split(",").map(Number);
const RECOVERY_VUS = Number(__ENV.RECOVERY_VUS || 10);

export const options = {
  scenarios: {
    resellers: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        ...STEPS.flatMap((target) => [
          { duration: "1m", target },
          { duration: "1m", target },
        ]),
        // back to a light load: does it recover on its own?
        { duration: "30s", target: RECOVERY_VUS },
        { duration: "2m", target: RECOVERY_VUS },
        { duration: "15s", target: 0 },
      ],
      gracefulRampDown: "15s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
    ...Object.fromEntries(FLOWS.map((f) => [`http_req_duration{flow:${f}}`, ["p(95)<2000"]])),
    ...PER_FLOW_COUNTS,
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export default resellerJourney;

export function handleSummary(data) {
  return {
    "results/stress-summary.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}
