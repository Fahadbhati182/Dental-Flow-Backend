import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  isAuthenticated,
  logoutUser,
  verifyEmailOTP,
  sendVerifyEmailOTP,
  resetPassword,
  sendResetPasswordOTP,
  refreshAccessToken,
  redirectToGoogleOAuth,
  googleOAuthCallback,
  googleOneTapLogin,
} from "../controllers/auth.controller.js";
import { authUser } from "../middlewares/authUser.js";

const authRouter = express.Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.post("/profile", authUser, getCurrentUser);
authRouter.post("/is-auth", isAuthenticated);
authRouter.get("/logout", logoutUser);

authRouter.get("/send-verify-email-otp", authUser, sendVerifyEmailOTP);
authRouter.post("/verify-email-otp", authUser, verifyEmailOTP);

authRouter.post("/send-reset-password-otp", authUser, sendResetPasswordOTP);
authRouter.post("/reset-password", authUser, resetPassword);

authRouter.post("/refresh-token", refreshAccessToken);

authRouter.get("/oauth/google", redirectToGoogleOAuth);
authRouter.get("/oauth/google/callback", googleOAuthCallback);
authRouter.post("/oauth/google/onetap", googleOneTapLogin);

export default authRouter;
