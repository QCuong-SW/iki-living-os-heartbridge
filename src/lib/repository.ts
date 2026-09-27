import { MongoClient } from "mongodb";
import { seed, transition, normalizeFamilyState, type State, type Action } from "./domain";
const globals = globalThis as unknown as { hbMongo?: Promise<MongoClient> };
type SessionDocument = { _id: string; state: State; expiresAt: Date };
export const mode = () =>
  process.env.DATA_MODE === "mongo" ? "mongo" : "mock";
export async function database() {
  if (!process.env.MONGODB_URI)
    throw new Error("MONGODB_URI is required for mongo mode");
  globals.hbMongo ??= new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 3000,
  })
    .connect()
    .catch((error) => {
      globals.hbMongo = undefined;
      throw error;
    });
  return (await globals.hbMongo).db(process.env.MONGODB_DB || "heartbridge");
}
export async function readState(session: string): Promise<State> {
  const db = await database();
  const collection = db.collection<{
    _id: string;
    state: State;
    expiresAt: Date;
  }>("demoSessions");
  const existing = await collection.findOne({ _id: session });
  if (existing) return normalizeFamilyState(existing.state);
  const template = await db
    .collection<{ key: string; state: State }>("demoTemplates")
    .findOne({ key: "nguyen-family-v1" });
  await collection.updateOne(
    { _id: session },
    {
      $setOnInsert: {
        state: normalizeFamilyState(template?.state ?? seed()),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    },
    { upsert: true },
  );
  return normalizeFamilyState((await collection.findOne({ _id: session }))!.state);
}
export async function mutateState(
  session: string,
  action: Action,
  revision: number,
) {
  const db = await database();
  const current = await readState(session);
  if (current.revision !== revision) throw new Error("CONFLICT");
  const next = transition(current, action);
  const result = await db
    .collection<SessionDocument>("demoSessions")
    .updateOne(
      { _id: session, "state.revision": revision },
      { $set: { state: next } },
    );
  if (result.matchedCount !== 1) throw new Error("CONFLICT");
  return next;
}
