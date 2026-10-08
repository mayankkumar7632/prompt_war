import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

try {
  await connectDatabase();
  const server = app.listen(env.port, () => {
    console.info(`StoryLearn AI API listening on port ${env.port}.`);
  });

  const shutdown = (signal) => {
    console.info(`${signal} received; closing the HTTP server.`);
    server.close(async (error) => {
      if (error) {
        console.error("Failed to close the HTTP server cleanly.", error);
        process.exitCode = 1;
      }
      const mongoose = await import("mongoose");
      await mongoose.default.disconnect();
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
} catch (error) {
  console.error("Unable to start StoryLearn AI API.", error);
  process.exitCode = 1;
}
