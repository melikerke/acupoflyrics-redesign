import { fetchTrackBundle } from "../../server/spotify.js";
import { assertMethod, credentials, requestUrl, sendJson } from "../../server/vercelApi.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["GET"]);
    const url = requestUrl(req);
    const data = await fetchTrackBundle(url.searchParams.get("url"), credentials().spotify);
    return sendJson(res, 200, data);
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message || "Sunucu hatası." });
  }
}
