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
import { FLOWS, PER_FLOW_COUNTS, resellerJourney, textSummary } from "./journey.js";

const VUS = Number(__ENV.VUS || 20);
const HOLD = __ENV.HOLD || "3m";

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
    ...Object.fromEntries(FLOWS.map((f) => [`http_req_duration{flow:${f}}`, ["p(95)<1000"]])),
    signed_out: ["rate==0"],
    ...PER_FLOW_COUNTS,
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export default resellerJourney;

export function handleSummary(data) {
  return {
    "results/summary.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}
