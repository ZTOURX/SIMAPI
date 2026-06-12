import { Router, type IRouter } from "express";
import { processChat } from "../core/conversation-manager.js";
import { ChatRequestSchema } from "../schemas/chat.schema.js";
import { chatRateLimiter } from "../middleware/rate-limiter.js";

const router: IRouter = Router();

/**
 * @openapi
 * /api/chat:
 *   post:
 *     summary: Send a chat message
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message, threadId]
 *             properties:
 *               message:
 *                 type: string
 *               threadId:
 *                 type: string
 *               userId:
 *                 type: string
 *               personalityId:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI response
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post("/chat", chatRateLimiter, async (req, res): Promise<void> => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }

  const response = await processChat(parsed.data);
  res.json(response);
});

export default router;
