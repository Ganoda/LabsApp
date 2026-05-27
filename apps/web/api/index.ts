import { handle } from 'hono/vercel';
// @ts-ignore
import app from '../build/server/index.js';
// @ts-ignore
import * as serverBuild from '../build/server/assets/server-build.js';
import { createRequestHandler } from 'react-router';

// Mount React Router to the Hono app manually
app.use('*', async (c: any) => {
  const requestHandler = createRequestHandler(serverBuild as any, process.env.NODE_ENV);
  return requestHandler(c.req.raw, {});
});

const handler = handle(app);

// @ts-ignore
export const GET = async (req: Request) => handler(req);
// @ts-ignore
export const POST = async (req: Request) => handler(req);
// @ts-ignore
export const PUT = async (req: Request) => handler(req);
// @ts-ignore
export const PATCH = async (req: Request) => handler(req);
// @ts-ignore
export const DELETE = async (req: Request) => handler(req);
// @ts-ignore
export const OPTIONS = async (req: Request) => handler(req);
