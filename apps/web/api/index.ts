import { handle } from 'hono/vercel';
import serverPromise from '../build/server/index.js';

let handler: any;
const getHandler = async () => {
  if (!handler) {
    const server = await serverPromise;
    handler = handle(server);
  }
  return handler;
};

export const GET = async (req: any, ctx: any) => (await getHandler())(req, ctx);
export const POST = async (req: any, ctx: any) => (await getHandler())(req, ctx);
export const PUT = async (req: any, ctx: any) => (await getHandler())(req, ctx);
export const PATCH = async (req: any, ctx: any) => (await getHandler())(req, ctx);
export const DELETE = async (req: any, ctx: any) => (await getHandler())(req, ctx);
export const OPTIONS = async (req: any, ctx: any) => (await getHandler())(req, ctx);
