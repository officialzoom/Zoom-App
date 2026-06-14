import { Router, type IRouter } from "express";
import healthRouter from "./health";
import userRouter from "./user";
import walletRouter from "./wallet";
import assetsRouter from "./assets";
import investmentsRouter from "./investments";
import dashboardRouter from "./dashboard";
import adsRouter from "./ads";
import donationsRouter from "./donations";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/user", userRouter);
router.use("/wallet", walletRouter);
router.use("/assets", assetsRouter);
router.use("/investments", investmentsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/ads", adsRouter);
router.use("/donations", donationsRouter);

export default router;
