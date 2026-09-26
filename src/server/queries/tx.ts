/** Run `fn` inside a SQLite transaction (services never touch `db` directly). */
import { db } from "../db";

export const transaction = <T>(fn: () => T): T => db.transaction(fn)();
