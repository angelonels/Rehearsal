import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import type { Database } from "@rehearsal/database";
import { users } from "@rehearsal/database";
import type { LoginInput, RegisterInput } from "@rehearsal/contracts";
import { AppError } from "../../lib/errors.js";

export class AuthService {
  constructor(private db: Database, private secret: string, private expiresIn: string) {}

  async register(input: RegisterInput) {
    const existing = await this.db.query.users.findFirst({ where: eq(users.email, input.email) });
    if (existing) throw new AppError(409, "EMAIL_IN_USE", "An account already exists for this email.");
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const [user] = await this.db.insert(users).values({ ...input, passwordHash }).returning();
    if (!user) throw new Error("User insert failed");
    return this.issue(user);
  }

  async login(input: LoginInput) {
    const user = await this.db.query.users.findFirst({ where: eq(users.email, input.email) });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }
    return this.issue(user);
  }

  private issue(user: typeof users.$inferSelect) {
    const token = jwt.sign({ sub: user.id }, this.secret, { expiresIn: this.expiresIn as NonNullable<jwt.SignOptions["expiresIn"]> });
    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
  }
}

export function verifyToken(token: string, secret: string) {
  const payload = jwt.verify(token, secret);
  if (typeof payload === "string" || !payload.sub) throw new AppError(401, "UNAUTHORIZED", "Sign in to continue.");
  return payload.sub;
}
