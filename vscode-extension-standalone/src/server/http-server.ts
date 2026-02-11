import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { userMessageSchema } from 'src/types/user-message';
import { handleRequestAgentPrompt } from 'src/services/agent-service';

const REQUEST_AGENT_PROMPT_PATH = '/stagewise-toolbar-app/request-agent-prompt';
const PORT_PATH = '/stagewise-toolbar-app/port';

export function createHttpServer(port: number): http.Server {
  const app = express();
  app.use(
    cors({
      origin: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));

  app.post(REQUEST_AGENT_PROMPT_PATH, async (req, res) => {
    const parsed = userMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid UserMessage',
        details: parsed.error.flatten(),
      });
      return;
    }
    try {
      await handleRequestAgentPrompt(parsed.data);
      res.status(204).send();
    } catch (err) {
      console.error('[stagewise] request-agent-prompt error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Internal server error',
      });
    }
  });

  app.get(PORT_PATH, (_req, res) => {
    res.json({ port });
  });

  const server = http.createServer(app);
  server.listen(port);
  return server;
}
