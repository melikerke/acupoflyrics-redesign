import { upsertRecordData } from "./ingest.js";

const API = "https://api.github.com";
const POSTS_PATH = "src/data/posts.json";
const ARTISTS_PATH = "src/data/artists.json";

function githubConfig() {
  return {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER || "melikerke",
    repo: process.env.GITHUB_REPO || "acupoflyrics-redesign",
    branch: process.env.GITHUB_BRANCH || "main",
  };
}

async function github(path, options = {}) {
  const { token, owner, repo } = githubConfig();
  if (!token) {
    const error = new Error(
      "Canlı yayın için GITHUB_TOKEN eksik. Vercel Environment Variables içine repo yazma yetkili bir token ekleyin."
    );
    error.statusCode = 409;
    throw error;
  }

  const res = await fetch(`${API}/repos/${owner}/${repo}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const error = new Error(data?.message ? `GitHub hatası (${res.status}): ${data.message}` : `GitHub hatası (${res.status})`);
    error.statusCode = res.status;
    throw error;
  }
  return data;
}

async function readJsonFile(filePath) {
  const { branch } = githubConfig();
  const data = await github(`/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`);
  const raw = Buffer.from(data.content || "", "base64").toString("utf8");
  return {
    json: JSON.parse(raw),
    sha: data.sha,
  };
}

async function writeJsonFile(filePath, json, sha, message) {
  const { branch } = githubConfig();
  return github(`/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      branch,
      sha,
      content: Buffer.from(`${JSON.stringify(json, null, 2)}\n`, "utf8").toString("base64"),
    }),
  });
}

export async function publishRecordToGitHub(record) {
  if (!record || (!record.spotify && !record.song)) {
    throw new Error("Geçersiz kayıt: Spotify verisi yok.");
  }

  const [postsFile, artistsFile] = await Promise.all([
    readJsonFile(POSTS_PATH),
    readJsonFile(ARTISTS_PATH),
  ]);

  const updated = upsertRecordData(record, postsFile.json, artistsFile.json);
  const message = `${updated.result.updated ? "Update" : "Add"} ${updated.result.title}`;

  const postsCommit = await writeJsonFile(POSTS_PATH, updated.posts, postsFile.sha, message);
  await writeJsonFile(ARTISTS_PATH, updated.artists, artistsFile.sha, message);

  return {
    ...updated.result,
    commitUrl: postsCommit?.commit?.html_url || null,
    persistent: true,
  };
}
