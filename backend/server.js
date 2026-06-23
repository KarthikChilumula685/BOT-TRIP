import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";
import multer from "multer";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import memoryRoutes from "./routes/memoryRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
const port = process.env.PORT || 5000;

console.log("ENV CHECK:", process.env.MONGO_URI);

app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_URL?.split(",").map((url) => url.trim()) || [
      "http://localhost:5173"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Range"]
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "BOT-TRIP API",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/memories", memoryRoutes);
app.use("/api/users", userRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid resource id" });
  }

  res.status(error.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : error.message || "Something went wrong"
  });
});

async function start() {
  try {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
    if (!process.env.TRIP_SECRET_CODE) {
      throw new Error("TRIP_SECRET_CODE is not configured");
    }
    await connectDatabase();
    app.listen(port, () => {
      console.log(`BOT-TRIP API listening on port ${port}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

start();
