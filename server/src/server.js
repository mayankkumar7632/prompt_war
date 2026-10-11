import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function shutdown(signal, server) {
  console.info(`${signal} received; closing the HTTP server.`);
  await new Promise((resolve) => {
    server.close((error) => {
      if (error) {
        console.error("Failed to close the HTTP server cleanly.", error);
        process.exitCode = 1;
      }
      resolve();
    });
  });

  const mongoose = await import("mongoose");
  await mongoose.default.disconnect();
}

try {
  await connectDatabase();
  const server = app.listen(env.port, () => {
    console.info(`StoryLearn AI API listening on port ${env.port}.`);
  });

  server.on("error", (error) => {
    if (error && error.code === "EADDRINUSE") {
      console.error(`Port ${env.port} is already in use. Stop the existing process or set PORT to another value.`);
      process.exitCode = 1;
      server.close(() => {
        process.exit();
      });
      return;
    }

    console.error("Unable to start StoryLearn AI API.", error);
    process.exitCode = 1;
    process.exit();
  });

  process.once("SIGINT", () => shutdown("SIGINT", server));
  process.once("SIGTERM", () => shutdown("SIGTERM", server));
} catch (error) {
  console.error("Unable to start StoryLearn AI API.", error);
  process.exitCode = 1;
}
