import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("cleanup direct sales after 30 days", { hours: 1 }, internal.sales.cleanupOldDirectSales);

export default crons;
