import { handle } from 'hono/vercel';
import app from '../build/server/index.js';
import * as serverBuild from '../build/server/assets/server-build.js';
import { createRequestHandler } from 'react-router';

// Mount React Router to the Hono app manually
app.use('*', async (c: any) => {
  const requestHandler = createRequestHandler(serverBuild as any, process.env.NODE_ENV);
  return requestHandler(c.req.raw, {});
});

const handler = handle(app);

export const GET = async (req: any, ctx: any) => handler(req, ctx);
export const POST = async (req: any, ctx: any) => handler(req, ctx);
export const PUT = async (req: any, ctx: any) => handler(req, ctx);
export const PATCH = async (req: any, ctx: any) => handler(req, ctx);
export const DELETE = async (req: any, ctx: any) => handler(req, ctx);
export const OPTIONS = async (req: any, ctx: any) => handler(req, ctx);
