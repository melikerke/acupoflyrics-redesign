import { assertMethod, readJsonBody, sendJson, serverlessWriteError } from "../server/vercelApi.js";
import { publishRecordToGitHub } from "../server/githubPublish.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["POST"]);
    const record = await readJsonBody(req);
    if (!process.env.GITHUB_TOKEN) {
      return sendJson(res, 409, serverlessWriteError());
    }
    const result = await publishRecordToGitHub(record);
    return sendJson(res, 200, result);
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message || "Sunucu hatası." });
  }
}
