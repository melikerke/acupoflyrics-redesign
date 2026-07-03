import { updateCharts } from "../../server/charts.js";
import { assertMethod, credentials, sendJson } from "../../server/vercelApi.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["POST"]);
    const result = await updateCharts({ spotify: credentials().spotify, write: false });
    return sendJson(res, 200, {
      ...result,
      persistent: false,
      warning:
        "Vercel canlı ortamında liste verisi anlık çekildi; kalıcı yayın için GitHub/CMS yazma bağlantısı gerekir.",
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message || "Sunucu hatası." });
  }
}
