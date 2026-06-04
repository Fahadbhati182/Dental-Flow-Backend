import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config.js";
import authRouter from "./routes/auth.routes.js";

const app = express();

const allowedOrgins = ["*"];

app.use(express.json());
app.use(cors({ origin: allowedOrgins }));
app.use(cookieParser("dental-app-backend-secret"));

// routes
app.use("/api/v1/auth", authRouter);

app.use("/", (req, res) => {
  return res.send(`Server of Dental Website is running on ${process.env.PORT}`);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
