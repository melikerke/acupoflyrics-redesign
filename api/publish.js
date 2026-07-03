import { assertMethod, readJsonBody, sendJson, serverlessWriteError } from "../server/vercelApi.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["POST"]);
    await readJsonBody(req);
    return sendJson(res, 409, serverlessWriteError());
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message || "Sunucu hatası." });
  }
}
