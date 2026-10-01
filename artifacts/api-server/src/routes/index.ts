import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/wallet", paymentsRouter);

export default router;