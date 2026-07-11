import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config.js";
import authRouter from "./routes/auth.routes.js";
import ApiResponse from "./utils/ApiResponse.js";
import ApiError from "./utils/ApiError.js";
import adminRouter from "./routes/admin.routes.js";
import dentistRouter from "./routes/dentist.routes.js";
import patientRouter from "./routes/patient.route.js";
import receptionistRouter from "./routes/receptionist.route.js";

const app = express();

const allowedOrgins = ["*"];

app.use(express.json());
app.use(cors({ origin: allowedOrgins }));
app.use(cookieParser("dental-app-backend-secret"));

// routes
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/patient", patientRouter);
app.use("/api/v1/user", dentistRouter);
app.use("/api/v1/receptionist", receptionistRouter);

app.use("/", (req, res) => {
  return res.send(`Server of Dental Website is running on ${process.env.PORT}`);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof ApiError) {
    return res
      .status(err.status || 500)
      .json(new ApiResponse(err.status || 500, err.message || "Error", null));
  }

  return res
    .status(500)
    .json(new ApiResponse(500, "Internal server error", null));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
