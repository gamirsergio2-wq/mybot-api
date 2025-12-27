import express from "express";
import cors from "cors";
import metricsRoutes from "./routes/metrics.js";
import restaurantRoutes from "./routes/restaurants.js";
import { apiKeyAuth } from "./middleware/auth.js";

const app = express();
app.use(cors());
app.use(express.json());

// health check (no auth)
app.get("/health", (_req, res) => res.status(200).send("OK"));

// simple auth for Base44 (or any client)
app.use(apiKeyAuth);

// routes
app.use("/metrics", metricsRoutes);
app.use("/restaurants", restaurantRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 mybot-api listening on", PORT);
});
