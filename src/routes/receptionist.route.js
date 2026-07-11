import express from "express";
import {
  getPatients,
  getPatientDetails,
  getTodaysAppointments,
  nextAppointment,
  getAvailableDentistsWithSlots,
  requestDentistAppointment,
} from "../controllers/receptionist.controller.js";
import { authUser, checkRolesAllowed } from "../middlewares/authUser.js";

const receptionistRouter = express.Router();

receptionistRouter.use(authUser, checkRolesAllowed(["receptionist"]));

receptionistRouter.get("/patients", getPatients);
receptionistRouter.get("/patients/:id", getPatientDetails);

receptionistRouter.get("/appointments/today", getTodaysAppointments);
receptionistRouter.get("/appointments/next", nextAppointment);

// Available dentists with slots
receptionistRouter.get("/available-dentists", getAvailableDentistsWithSlots);

// Create appointment request
receptionistRouter.post(
  "/appointment-request",
  requestDentistAppointment
);

export default receptionistRouter;