import { MongoClient } from "mongodb";
import { seed } from "../src/lib/domain";
async function main() {
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  );
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "heartbridge");
    await db
      .collection("demoTemplates")
      .updateOne(
        { key: "nguyen-family-v1" },
        { $setOnInsert: { key: "nguyen-family-v1", state: seed() } },
        { upsert: true },
      );
    await db
      .collection("demoSessions")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log("Demo template ready. Existing user sessions are unchanged.");
  } finally {
    await client.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
