import express from "express";
import { authUser, checkRolesAllowed } from "../middlewares/authUser.js";
import { addDentistDetails } from "../controllers/dentist.controller.js";

const dentistRouter = express.Router();

dentistRouter.post(
  "/add-dentist-details",
  authUser,
  checkRolesAllowed(["dentist"]),
  addDentistDetails,
);

export default dentistRouter;
