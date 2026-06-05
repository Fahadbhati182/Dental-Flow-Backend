import { supabase } from "../config/db.js";
import { sendEmail } from "../config/nodemailer.js";
import authService from "../services/authServices.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsynHandler from "../utils/AsynHandler.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import oauthClient from "../config/oauthClient.js";

export const registerUser = AsynHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new ApiError(400, "Please fill all the fields");
  }

  const { data: exitingUser, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();
  console.log(exitingUser, userError);

  if (exitingUser) {
    res.status(400);
    throw new ApiError(400, "User already exists");
  }

  const hashPassword = await authService.hashPassword(password);
  const { data: user, error } = await supabase.from("users").insert({
    name,
    email,
    password: hashPassword,
    role_type: "patient",
  });

  if (error || !user) {
    res.status(500);
    throw new ApiError(500, "Something went wrong");
  }

  res
    .status(201)
    .json(new ApiResponse(201, "User registered successfully", user));
});

export const loginUser = AsynHandler(async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    res.status(400);
    throw new ApiError(400, "Please fill all the fields");
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .eq("role_type", role)
    .single();

  if (error || !user) {
    res.status(400);
    throw new ApiError(400, "Invalid credentials");
  }

  // oauth only for patients
  if (role === "patient" && user.oauth_provider) {
    res.status(400);
    throw new ApiError(400, `Please login with ${user.oauth_provider} account`);
  }

  const isMatch = await authService.comparePassword(password, user.password);
  if (!isMatch) {
    res.status(400);
    throw new ApiError(400, "Invalid credentials");
  }

  const { accessToken, refreshToken } =
    await authService.generateAccessAndRefreshTokens(user.id);

  await supabase
    .from("users")
    .update({ refresh_token: refreshToken })
    .eq("id", user.id);

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

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Logged in successfully",
      data: userData,
    }),
  );
});

export const logoutUser = AsynHandler(async (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.status(200).json(new ApiResponse(200, "Logged out successfully", null));
});

export const getCurrentUser = AsynHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    res.status(404);
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(new ApiResponse(200, "User fetched successfully", user));
});

export const isAuthenticated = AsynHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401);
    throw new ApiError(401, "Unauthorized");
  }

  res.status(200).json(new ApiResponse(200, "User is authenticated", null));
});

export const sendVerifyEmailOTP = AsynHandler(async (req, res) => {
  const { id: loginUserId } = req.user;
  console.log(loginUserId);

  if (!loginUserId) {
    res.status(401);
    throw new ApiError(401, "Unauthorized");
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", loginUserId)
    .single();

  if (error || !user) {
    res.status(404);
    throw new ApiError(404, "User not found");
  }

  if (user.is_email_verified) {
    res.status(400);
    throw new ApiError(400, "Email is already verified");
  }

  const OTP = crypto.randomInt(100000, 999999).toString();

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);

  await supabase
    .from("users")
    .update({
      email_verification_otp: OTP,
      email_verification_otp_expires_at: expiresAt.toISOString(),
    })
    .eq("id", user.id);

  sendEmail(
    user.email,
    "Verify your email",
    `
    Your OTP for email verification is: ${OTP}
    
    This OTP is valid for 5 minutes.
      `,
  );

  res.status(200).json(new ApiResponse(200, "OTP sent successfully", null));
});

export const verifyEmailOTP = AsynHandler(async (req, res) => {
  const { id: loginUserId } = req.user;
  const { otp } = req.body;

  if (!loginUserId) {
    res.status(401);
    throw new ApiError(401, "Unauthorized");
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", loginUserId)
    .single();

  if (error || !user) {
    res.status(404);
    throw new ApiError(404, "User not found");
  }

  if (user.is_email_verified) {
    res.status(400);
    throw new ApiError(400, "Email is already verified");
  }

  const verificationExpiresAt = user.email_verification_otp_expires_at
    ? new Date(user.email_verification_otp_expires_at).getTime()
    : 0;

  if (
    user.email_verification_otp !== otp ||
    verificationExpiresAt < Date.now()
  ) {
    res.status(400);
    throw new ApiError(400, "Invalid or expired OTP");
  }

  await supabase
    .from("users")
    .update({
      is_email_verified: true,
      email_verification_otp: "",
      email_verification_otp_expires_at: null,
    })
    .eq("id", user.id);

  res
    .status(200)
    .json(new ApiResponse(200, "Email verified successfully", null));
});

export const sendResetPasswordOTP = AsynHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new ApiError(400, "Please provide an email");
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();
  console.log(user, error);

  if (error || !user) {
    res.status(404);
    throw new ApiError(404, "User not found");
  }

  const OTP = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);
  await supabase
    .from("users")
    .update({
      password_reset_otp: OTP,
      password_reset_otp_expires_at: expiresAt.toISOString(),
    })
    .eq("id", user.id);

  sendEmail(
    user.email,
    "Reset your password",
    `
    Your OTP for password reset is: ${OTP}
    This OTP is valid for 5 minutes.
      `,
  );
  res
    .status(200)
    .json(new ApiResponse(200, "Reset Password OTP sent successfully", null));
});

export const resetPassword = AsynHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    res.status(400);
    throw new ApiError(400, "Please fill all the fields");
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) {
    res.status(404);
    throw new ApiError(404, "User not found");
  }

  if (
    user.password_reset_otp !== otp ||
    (user.password_reset_otp_expires_at
      ? new Date(user.password_reset_otp_expires_at).getTime()
      : 0) < Date.now()
  ) {
    res.status(400);
    throw new ApiError(400, "Invalid or expired OTP");
  }

  await supabase
    .from("users")
    .update({
      password: await authService.hashPassword(newPassword),
      password_reset_otp: "",
      password_reset_otp_expires_at: null,
    })
    .eq("id", user.id);

  res
    .status(200)
    .json(new ApiResponse(200, "Password reset successfully", null));
});

export const refreshAccessToken = AsynHandler(async (req, res) => {
  const incomingRefreshToken =
    req?.signedCookies.refreshToken ||
    req?.headers?.authorization?.split(" ")[1] ||
    req.body.refreshToken;

  if (!incomingRefreshToken) {
    res.status(401);
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const { data: exitingUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", decodedRefreshToken.id)
      .eq("refresh_token", incomingRefreshToken)
      .single();

    if (userError || !exitingUser) {
      res.status(401);
      throw new ApiError(401, "Unauthorized");
    }

    const { accessToken, refreshToken } =
      await authService.generateAccessAndRefreshTokens(exitingUser.id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        signed: true,
        sameSite: "lax",
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        signed: true,
        sameSite: "lax",
      })
      .json(
        new ApiResponse(200, "Access token refreshed successfully", {
          accessToken,
          refreshToken,
        }),
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(401, "Unauthorized");
  }
});

// redirect user to google oauth consent screen
export const redirectToGoogleOAuth = AsynHandler(async (req, res) => {
  const oauthUrl = await oauthClient.generateAuthUrl({
    scope: ["openid", "profile", "email"],
    prompt: "consent",
  });
  res.redirect(oauthUrl);
});

// handle google oauth callback and exchange code for access token and refresh token
export const googleOAuthCallback = AsynHandler(async (req, res) => {
  const { code } = req.query;

  if (!code) {
    res.status(400);
    throw new ApiError(400, "Invalid request");
  }

  const { tokens } = await oauthClient.getToken(code);
  const idToken = tokens.id_token;

  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    res.status(400);
    throw new ApiError(400, "Invalid ID token");
  }

  if (!payload.email) {
    throw new ApiError(400, "Email not found in token");
  }

  let user = null;
  const { data: existingUser, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", payload.email)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Something went wrong");
  }

  if (existingUser) {
    user = existingUser;
  } else {
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        name: payload.name,
        email: payload.email,
        is_email_verified: payload.email_verified,
        password: null,
        oauth_provider: "google",
      })
      .select("*")
      .single();

    if (error || !newUser) {
      res.status(500);
      throw new ApiError(500, "Internal server error");
    }
    user = newUser;
  }

  const { accessToken, refreshToken } =
    await authService.generateAccessAndRefreshTokens(user.id);
  res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      signed: true,
      sameSite: "lax",
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      signed: true,
      sameSite: "lax",
    });

  return res.redirect(process.env.FRONTEND_URL);
});

export const googleOneTapLogin = AsynHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    res.status(400);
    throw new ApiError(400, "Token is required");
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    res.status(400);
    throw new ApiError(400, "Invalid ID token");
  }

  if (!payload.email) {
    res.status(400);
    throw new ApiError(400, "Email not found in token");
  }

  let user = null;
  const { data: existingUser, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", payload.email)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Database error");
  }

  if (existingUser) {
    user = existingUser;
  } else {
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        name: payload.name,
        email: payload.email,
        is_email_verified: payload.email_verified,
        password: null,
        oauth_provider: "google",
      })
      .select("*")
      .single();

    if (error || !newUser) {
      res.status(500);
      throw new ApiError(500, "Internal server error");
    }
    user = newUser;
  }

  const { accessToken, refreshToken } =
    await authService.generateAccessAndRefreshTokens(user.id);
  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      signed: true,
      sameSite: "lax",
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      signed: true,
      sameSite: "lax",
    })
    .json(
      new ApiResponse(200, "Logged in successfully", {
        accessToken,
        refreshToken,
      }),
    );
});
