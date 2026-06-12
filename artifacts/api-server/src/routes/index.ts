import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import chatRouter from "./chat.js";
import memoryRouter from "./memory.js";
import threadsRouter from "./threads.js";
import knowledgeRouter from "./knowledge.js";
import personalityRouter from "./personality.js";
import analyticsRouter from "./analytics.js";
import modelsRouter from "./models.js";
import adminRouter from "./admin.js";
import diagnosticsRouter from "./diagnostics.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(memoryRouter);
router.use(threadsRouter);
router.use(knowledgeRouter);
router.use(personalityRouter);
router.use(analyticsRouter);
router.use(modelsRouter);
router.use(adminRouter);
router.use(diagnosticsRouter);

export default router;
