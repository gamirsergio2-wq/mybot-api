import express from "express";
import cors from "cors";
import metricsRoutes from "./routes/metrics.js";
import restaurantRoutes from "./routes/restaurants.js";
import { apiKeyAuth } from "./middleware/auth.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.send("OK"));

app.use(apiKeyAuth);

app.use("/metrics", metricsRoutes);
app.use("/restaurants", restaurantRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 mybot-api running on port", PORT);
});
