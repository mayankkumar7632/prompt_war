import app from "../server/src/app.js";
import { connectDatabase } from "../server/src/config/database.js";

export default async function handler(request, response) {
  try {
    await connectDatabase();
    return app(request, response);
  } catch (error) {
    console.error("Vercel API could not connect to MongoDB.", error?.name ?? "UnknownError");
    if (!response.headersSent) {
      response.status(503).json({
        error: "The database is temporarily unavailable. Please try again shortly.",
      });
    }
  }
}
