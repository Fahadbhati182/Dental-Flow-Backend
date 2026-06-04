import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "../config/db.js";

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(userPassword, hashPassword) {
  return await bcrypt.compare(userPassword, hashPassword);
}

function generateAccessToken(id, role, name) {
  return jwt.sign(
    {
      id: id,
      name: name,
      role: role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    },
  );
}

function generateRefreshToken(id) {
  return jwt.sign(
    {
      id: id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    },
  );
}

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
      
    if (error || !user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = generateAccessToken(user.id, user.role, user.name);
    const refreshToken = generateRefreshToken(user.id);

    await supabase
      .from("users")
      .update({ refresh_token: refreshToken })
      .eq("id", userId);

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const authService = {
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
  generateAccessAndRefreshTokens,
};

export default authService;
