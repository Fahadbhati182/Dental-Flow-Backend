import express from "express";
import { authUser, checkRolesAllowed } from "../middlewares/authUser.js";
import { addDentistDetails } from "../controllers/user.controller.js";

const userRouter = express.Router();

userRouter.post(
  "/add-dentist-details",
  authUser,
  checkRolesAllowed(["dentist"]),
  addDentistDetails,
);

export default userRouter; 