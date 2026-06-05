import "dotenv/config.js";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import { supabase } from "../config/db.js";

export async function authUser(req, res, next) {
  try {
    const accessToken =
      req?.signedCookies.accessToken ||
      req?.headers?.authorization?.split(" ")[1];

    if (!accessToken) {
      throw new ApiError(401, "Unauthorized");
    }

    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    console.log(decoded);

    if (decoded.id) {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", decoded.id)
        .single();

      if (error || !user) {
        throw new ApiError(401, "Unauthorized");
      }
      req.user = user;
    }
    return next();
  } catch (error) {
    console.log(error);
    throw new ApiError(401, "Unauthorized");
  }
}



export const checkRolesAllowed = (allowedRoles) => {
  return (req, res, next) => {
    if (allowedRoles.includes(req.user.role_type)) {
      return next();
    }

    return res.status(403).json({
      message:
        "Access denied. You don't have permission to perform this action.",
    });
  };
};
