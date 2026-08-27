import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const convexUrl = process.env.VITE_CONVEX_URL;
if (!convexUrl) throw new Error("VITE_CONVEX_URL is required");

const client = new ConvexHttpClient(convexUrl);
const result = await client.mutation(api.seed.demo, {});
console.log(JSON.stringify(result));
