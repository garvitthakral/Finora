import express from "express";
import cors from "cors";
import type { CorsOptions } from "cors";
import userRouter from "./service/user/index.js";
import transactionRouter from "./service/transaction/index.js";
import statsRouter from "./service/stats/index.js";

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

app.use("/api/user", userRouter);
app.use("/api/transaction", transactionRouter);
app.use("/api/stats", statsRouter);

app.get("/", (_req, res) => {
  res.send("API is running 🚀");
});

export default app;
