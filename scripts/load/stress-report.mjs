/**
 * VES-72 — reads k6's CSV output (scripts/load/results/stress.csv) and prints
 * one row per 30 s window: active users, throughput, p95 and error rate, so the
 * breaking point and the recovery show up as a table (docs/STRESS_TEST.md).
 *
 *   node scripts/load/stress-report.mjs [results/stress.csv] [samples.csv]
 *
 * `samples.csv` (optional) is `scripts/load/sample-resources.sh`'s output; its
 * CPU and database-connection readings are averaged into the same windows.
 */
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const dir = new URL("./", import.meta.url);
const csv = process.argv[2] ?? new URL("results/stress.csv", dir).pathname;
const samplesFile = process.argv[3] ?? new URL("results/samples.csv", dir).pathname;
const WINDOW = 30;

const windows = new Map();
const bucket = (t) => {
  const key = Math.floor(t / WINDOW) * WINDOW;
  if (!windows.has(key)) windows.set(key, { durations: [], failed: 0, reqs: 0, vus: 0, res: [] });
  return windows.get(key);
};

let header;
for await (const line of createInterface({ input: createReadStream(csv) })) {
  const cols = line.split(",");
  if (!header) {
    header = Object.fromEntries(cols.map((c, i) => [c, i]));
    continue;
  }
  const metric = cols[header.metric_name];
  const t = Number(cols[header.timestamp]);
  const value = Number(cols[header.metric_value]);
  if (metric === "http_req_duration") bucket(t).durations.push(value);
  else if (metric === "http_reqs") bucket(t).reqs += 1;
  else if (metric === "http_req_failed") bucket(t).failed += value;
  else if (metric === "vus") bucket(t).vus = Math.max(bucket(t).vus, value);
}

if (existsSync(samplesFile)) {
  const [head, ...rows] = readFileSync(samplesFile, "utf8").trim().split("\n");
  const names = head.split(",");
  for (const row of rows) {
    const values = row.split(",").map(Number);
    const w = windows.get(Math.floor(values[0] / WINDOW) * WINDOW);
    if (w) w.res.push(Object.fromEntries(names.map((n, i) => [n, values[i]])));
  }
}

const start = Math.min(...windows.keys());
const avg = (list, key) =>
  list.length ? (list.reduce((s, r) => s + r[key], 0) / list.length).toFixed(0) : "-";
const p95 = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
};

console.log(
  "| t (s) | VUs | req/s | p95 (ms) | erros | CPU next | CPU db | CPU rest | CPU auth | conexões db |",
);
console.log("| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
for (const key of [...windows.keys()].sort((a, b) => a - b)) {
  const w = windows.get(key);
  const errors = w.reqs ? ((w.failed / w.reqs) * 100).toFixed(1) : "0.0";
  console.log(
    `| ${key - start} | ${w.vus} | ${(w.reqs / WINDOW).toFixed(1)} | ${p95(w.durations).toFixed(0)} | ${errors}% | ` +
      `${avg(w.res, "next_cpu")}% | ${avg(w.res, "db_cpu")}% | ${avg(w.res, "rest_cpu")}% | ${avg(w.res, "auth_cpu")}% | ` +
      `${avg(w.res, "db_connections")} |`,
  );
}
