import "dotenv/config";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsynHandler from "../utils/AsynHandler.js";
import { supabase } from "../config/db.js";
import authService from "../services/authServices.js";

export const loginAdmin = AsynHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!role || role !== "admin") {
    res.status(400);
    throw new ApiError(400, "Unauthorized access");
  }

  if (!email || !password) {
    res.status(400);
    throw new ApiError(400, "Please fill all the fields");
  }

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    res.status(401);
    throw new ApiError(401, "Invalid credentials");
  }

  let user = null;

  const { data: exitingAdmin, error: adminError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (adminError) {
    res.status(500);
    throw new ApiError(500, "Something went wrong");
  }

  if (exitingAdmin) {
    user = exitingAdmin;
  } else {
    const hashPassword = await authService.hashPassword(password);

    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        name: "Admin",
        email: process.env.ADMIN_EMAIL,
        password: hashPassword,
        role_type: "admin",
      })
      .select()
      .single();

    if (error) {
      res.status(500);
      throw new ApiError(500, "Something went wrong while creating admin user");
    }

    user = newUser;
  }
  const { refreshToken, accessToken } =
    await authService.generateAccessAndRefreshTokens(user.id);

  const { error: updateError } = await supabase
    .from("users")
    .update({ refresh_token: refreshToken })
    .eq("id", user.id);

  if (updateError) {
    throw new ApiError(500, "Failed to save refresh token");
  }

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 days
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    signed: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role_type,
    accessToken,
    refreshToken,
  };

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "admin logged in successfully",
      data: userData,
    }),
  );
});
