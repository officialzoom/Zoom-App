import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentsRouter from "./payments";
import assetsRouter from "./assets";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/assets", assetsRouter);
router.use("/wallet", paymentsRouter);

export default router;