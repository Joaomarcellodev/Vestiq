import { z } from "zod";

/** The periods the top products chart offers — mirrors `TopProductsPeriod`. */
export const topProductsPeriodSchema = z.union([z.literal(7), z.literal(30), z.literal(90)]);
