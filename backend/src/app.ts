import express from "express";
import cors from "cors";
import type { CorsOptions } from "cors";

const origin = process.env.CORS_ORIGIN;

const corsOptions: CorsOptions = {
  origin: origin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
const app = express();

app.use(express.json());
app.use(cors(corsOptions));

app.get("/", (_req, res) => {
  res.send("API is running 🚀");
});

export default app;
