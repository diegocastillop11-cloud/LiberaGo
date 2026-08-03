import express from "express";
import "./lib/env.js";
import { pushRouter } from "./routes/push.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { requestsRouter } from "./routes/requests.js";
import { serviceSuggestionsRouter } from "./routes/serviceSuggestions.js";

const app = express();
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString();
    },
  }),
);

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/push", pushRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/service-suggestions", serviceSuggestionsRouter);

export default app;
