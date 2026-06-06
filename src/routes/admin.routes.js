import express from "express";
import {
  addStaff,
  deleteStaff,
  getAllStaff,
  loginAdmin,
} from "../controllers/admin.controller.js";
import { authUser, checkRolesAllowed } from "../middlewares/authUser.js";

const adminRouter = express.Router();

adminRouter.post("/login", loginAdmin);
adminRouter.post("/add-staff", authUser, checkRolesAllowed(["admin"]), addStaff);
adminRouter.get("/all-staff", authUser, checkRolesAllowed(["admin"]), getAllStaff);
adminRouter.delete("/delete-staff/:staffId",authUser, checkRolesAllowed(["admin"]), deleteStaff)

export default adminRouter;
