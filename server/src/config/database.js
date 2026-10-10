import mongoose from "mongoose";
import { env } from "./env.js";

let connectionPromise;

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri, {
      dbName: "storylearn_ai",
      maxPoolSize: env.mongoMaxPoolSize,
      minPoolSize: 0,
      retryWrites: true,
      serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs,
      w: "majority",
    })
      .then(({ connection }) => {
        console.info("Connected to MongoDB.");
        return connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }
  return connectionPromise;
}
