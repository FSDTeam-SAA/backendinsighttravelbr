import express from "express";
import {
  register,
  login,
  verifyEmail,
  forgetPassword,
  resetPassword,
  verifyResetPasswordOTP,
  logout
} from "../controller/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/forget-password", forgetPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-reset-otp", verifyResetPasswordOTP);
router.post("/logout", logout);

export default router;
