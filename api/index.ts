import express from "express";
import "./lib/env";

const app = express();
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true });
});

export default app;
