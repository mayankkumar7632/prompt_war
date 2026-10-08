import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authenticate } from "./middleware/authenticate.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import parentRoutes from "./routes/parentRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import { env } from "./config/env.js";
import HttpError from "./middleware/HttpError.js";
import { authorizeRole } from "./middleware/authorizeRole.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new HttpError(403, "This origin is not allowed by CORS."));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/stories", authenticate, authorizeRole("parent", "teacher"), storyRoutes);
app.use("/api/questions", authenticate, authorizeRole("parent", "teacher"), questionRoutes);
app.use("/api/progress", authenticate, authorizeRole("parent", "teacher"), progressRoutes);
app.use("/api/dashboard", authenticate, authorizeRole("parent", "teacher"), dashboardRoutes);
app.use("/api/student", studentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
