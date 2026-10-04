import { Router, type IRouter } from "express";
import healthRouter from "./health";
import assetsRouter from "./assets";
import paymentsRouter from "./payments";
import userRouter from "./user";
import walletRouter from "./wallet";
import investmentsRouter from "./investments";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/assets", assetsRouter);
router.use("/user", userRouter);
router.use("/wallet", walletRouter);
// SquadCo payment endpoints (fund initiation, verification, banks CRUD)
router.use("/wallet", paymentsRouter);
router.use("/investments", investmentsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
