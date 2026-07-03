declare global {
  namespace Express {
    interface Request {
      id: string;
      userId?: string;
      log: import("pino").Logger;
    }
  }
}
export {};
