import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import { database, readState, mutateState } from "../src/lib/repository";

async function main() {
  const server = await MongoMemoryServer.create({
    binary: { version: "8.0.17" },
  });
  process.env.DATA_MODE = "mongo";
  process.env.MONGODB_URI = server.getUri();
  process.env.MONGODB_DB = "heartbridge_verification";
  try {
    const first = await readState("test-a");
    assert.equal(first.moments.length, 0);
    const planned = await mutateState("test-a", { type: "plan" }, 0);
    assert.equal(planned.moments.length, 1);
    assert.equal((await readState("test-a")).moments.length, 1);
    assert.equal((await readState("test-b")).moments.length, 0);
    const results = await Promise.allSettled([
      mutateState(
        "test-a",
        { type: "care", status: "accepted" },
        planned.revision,
      ),
      mutateState(
        "test-a",
        { type: "care", status: "accepted" },
        planned.revision,
      ),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(results.filter((r) => r.status === "rejected").length, 1);
    await (await database()).command({ ping: 1 });
    console.log(
      "MongoDB: persistence, isolated sessions and concurrent write protection passed.",
    );
    const code = await new Promise<number | null>((resolve, reject) => {
      const child = spawn("npx playwright test e2e/flows.spec.ts e2e/family-window.spec.ts e2e/ritual.spec.ts", {
        shell: true,
        stdio: "inherit",
        env: {
          ...process.env,
          HB_TEST_BASE_URL: "http://127.0.0.1:3101",
          HB_TEST_SERVER_COMMAND:
            "npx next dev --hostname 127.0.0.1 --port 3101",
        },
      });
      child.on("exit", resolve);
      child.on("error", reject);
    });
    assert.equal(code, 0, "Mongo browser flows must pass");
  } finally {
    const globalDb = globalThis as unknown as {
      hbMongo?: Promise<{ close: () => Promise<void> }>;
    };
    if (globalDb.hbMongo) await (await globalDb.hbMongo).close();
    globalDb.hbMongo = undefined;
    await server.stop();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
