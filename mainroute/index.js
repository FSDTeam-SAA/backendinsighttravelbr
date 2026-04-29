import express from "express";

import authRoute from "../route/auth.route.js";
// import adminRoute from "../route/admin.route.js";
// import userRoute from "../route/user.route.js";

const router = express.Router();

router.use("/auth", authRoute);
// router.use("/admin", adminRoute);
// router.use("/user", userRoute);

export default router;