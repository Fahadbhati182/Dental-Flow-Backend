import express from "express";
import {
  addStaff,
  deleteStaff,
  getAllStaff,
  loginAdmin,
} from "../controllers/admin.controller.js";
import { checkRolesAllowed } from "../middlewares/authUser.js";

const adminRouter = express.Router();

adminRouter.post("/login", loginAdmin);
adminRouter.post("/add-staff", checkRolesAllowed(["admin"]), addStaff);
adminRouter.post("/all-staff", checkRolesAllowed(["admin"]), getAllStaff);
adminRouter.delete("/delete-staff/:staffId",checkRolesAllowed(["admin"]) ,deleteStaff)

export default adminRouter;
