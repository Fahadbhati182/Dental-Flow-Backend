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

    if (decoded.userId) {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("userid", decoded.userId)
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
