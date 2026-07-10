import { addComment, listComments } from "../server/commentsStore.js";
import { assertMethod, method, readJsonBody, requestUrl, sendJson } from "../server/vercelApi.js";

export default async function handler(req, res) {
  try {
    const currentMethod = method(req);
    assertMethod(req, ["GET", "POST"]);

    if (currentMethod === "GET") {
      const url = requestUrl(req);
      const comments = await listComments(url.searchParams.get("slug") || "");
      return sendJson(res, 200, { comments });
    }

    const body = await readJsonBody(req);
    const comment = await addComment(body);
    return sendJson(res, 201, { comment });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message || "Sunucu hatası." });
  }
}
