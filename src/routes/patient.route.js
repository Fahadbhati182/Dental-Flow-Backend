import express from "express";
import {
  addPatientDetails,
  addPatientMedicalHistory,
  getPatientMedicalHistory,
  updatePatientMedicalHistory,
  updatePatientProfile,
  getNext,
  getPast,
  getUpcoming,
  scheduleAppointment,
} from "../controllers/patient.controller.js";
import { authUser, checkRolesAllowed } from "../middlewares/authUser.js";

const patientRouter = express.Router();

patientRouter.use(authUser, checkRolesAllowed(["patient"]));

// Patient Profile
patientRouter.post("/add", addPatientDetails);
patientRouter.put("/profile", updatePatientProfile);

// Medical History
patientRouter.post("/medical-history", addPatientMedicalHistory);
patientRouter.get("/medical-history", getPatientMedicalHistory);
patientRouter.put("/medical-history", updatePatientMedicalHistory);

// Appointments
patientRouter.get("/appointments/next", getNext);
patientRouter.get("/appointments/upcoming", getUpcoming);
patientRouter.get("/appointments/past", getPast);
patientRouter.post("/appointments/requests",scheduleAppointment)
export default patientRouter;