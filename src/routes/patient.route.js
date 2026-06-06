import express from "express";
import { authUser, checkRolesAllowed } from "../middlewares/authUser.js";
import { addPatientDetails } from "../controllers/patient.controller.js";

const patientRouter = express.Router();

patientRouter.post(
  "/add",
  authUser,
  checkRolesAllowed(["patient"]),
  addPatientDetails,
);

export default patientRouter;
