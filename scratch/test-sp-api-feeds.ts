import { getClient } from "../lib/amazon-sp-api-service"
import * as fs from "fs"

function loadEnv() {
  const content = fs.readFileSync(".env.local", "utf-8")
  for (const line of content.split("\n")) {
    if (line.trim() && !line.startsWith("#")) {
      const [key, ...vals] = line.split("=")
      if (key && vals.length) {
        process.env[key.trim()] = vals.join("=").trim()
      }
    }
  }
}
loadEnv()

async function run() {
  const client = getClient();
  try {
    console.log("Calling createFeedDocument...");
    const feedDoc = await client.callAPI({
      operation: "createFeedDocument",
      endpoint: "feeds",
      body: { contentType: "text/tab-separated-values; charset=UTF-8" },
      options: { raw_result: true }
    });
    console.log("Success:", JSON.stringify(feedDoc, null, 2));
  } catch (err: any) {
    console.error("Failed!");
    console.error("Message:", err.message);
    if (err.response) {
      console.error("Response:", err.response);
    } else {
      console.error(err);
    }
  }
}

run();
