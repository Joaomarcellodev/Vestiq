#!/usr/bin/env bash
# VES-72 — every 5 s, the CPU of the Next server and of the Supabase containers
# and the number of database connections, while the stress test runs:
#   scripts/load/sample-resources.sh <next-server pid> > scripts/load/results/samples.csv
set -u
pid="$1"
echo "time,next_cpu,db_cpu,auth_cpu,rest_cpu,kong_cpu,db_connections"
while kill -0 "$pid" 2>/dev/null; do
  now=$(date +%s)
  next=$(LC_ALL=C top -b -n 1 -p "$pid" | awk -v p="$pid" '$1 == p { print $9 }')
  stats=$(docker stats --no-stream --format '{{.Name}} {{.CPUPerc}}' | tr -d '%')
  cpu() { echo "$stats" | awk -v n="supabase_$1_Vestiq" '$1 == n { print $2 }'; }
  conns=$(docker exec supabase_db_Vestiq psql -U postgres -tAc "select count(*) from pg_stat_activity" 2>/dev/null)
  echo "$now,${next:-0},$(cpu db),$(cpu auth),$(cpu rest),$(cpu kong),${conns:-0}"
  sleep 5
done
