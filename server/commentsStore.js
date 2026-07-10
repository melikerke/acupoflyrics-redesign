import fs from "node:fs/promises";
import path from "node:path";

const API = "https://api.github.com";
const COMMENTS_PATH = "data/comments.json";

function githubConfig() {
  return {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER || "melikerke",
    repo: process.env.GITHUB_REPO || "acupoflyrics-redesign",
    branch: process.env.GITHUB_BRANCH || "main",
  };
}

function filePath() {
  return path.join(process.cwd(), COMMENTS_PATH);
}

function contentPath(file) {
  return encodeURIComponent(file).replace(/%2F/g, "/");
}

async function github(pathname, options = {}) {
  const { token, owner, repo } = githubConfig();
  if (!token) {
    const error = new Error("Yorumları canlıda kalıcı yazmak için Vercel Environment Variables içine GITHUB_TOKEN eklemek gerekiyor.");
    error.statusCode = 409;
    throw error;
  }

  const res = await fetch(`${API}/repos/${owner}/${repo}${pathname}`, {
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

async function readLocalComments() {
  try {
    const raw = await fs.readFile(filePath(), "utf8");
    return JSON.parse(raw || "{}");
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeLocalComments(json) {
  await fs.mkdir(path.dirname(filePath()), { recursive: true });
  await fs.writeFile(filePath(), `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

async function readGitHubComments() {
  const { branch } = githubConfig();
  const data = await github(`/contents/${contentPath(COMMENTS_PATH)}?ref=${encodeURIComponent(branch)}`);
  const raw = Buffer.from(data.content || "", "base64").toString("utf8");
  return { json: JSON.parse(raw || "{}"), sha: data.sha };
}

async function writeGitHubComments(json, sha, message) {
  const { branch } = githubConfig();
  return github(`/contents/${contentPath(COMMENTS_PATH)}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      branch,
      sha,
      content: Buffer.from(`${JSON.stringify(json, null, 2)}\n`, "utf8").toString("base64"),
    }),
  });
}

function cleanText(value, limit) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

export function validateComment(input = {}) {
  const slug = cleanText(input.slug, 120);
  const name = cleanText(input.name, 48);
  const body = cleanText(input.body, 900);
  const rating = Number(input.rating);
  const website = cleanText(input.website, 120);

  if (website) {
    const error = new Error("Yorum alınamadı.");
    error.statusCode = 400;
    throw error;
  }
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    const error = new Error("Yorum için sayfa bilgisi eksik.");
    error.statusCode = 400;
    throw error;
  }
  if (name.length < 2) {
    const error = new Error("İsim en az 2 karakter olmalı.");
    error.statusCode = 400;
    throw error;
  }
  if (body.length < 2) {
    const error = new Error("Yorum en az 2 karakter olmalı.");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    const error = new Error("Yıldız puanı 1 ile 5 arasında olmalı.");
    error.statusCode = 400;
    throw error;
  }
  if ((body.match(/https?:\/\//gi) || []).length > 1) {
    const error = new Error("Yorumda çok fazla link var.");
    error.statusCode = 400;
    throw error;
  }

  return { slug, name, body, rating };
}

export async function listComments(slug) {
  const cleanSlug = cleanText(slug, 120);
  if (!/^[a-z0-9-]+$/i.test(cleanSlug)) return [];
  const comments = process.env.GITHUB_TOKEN ? (await readGitHubComments()).json : await readLocalComments();
  return (comments[cleanSlug] || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function addComment(input) {
  const commentInput = validateComment(input);
  const comment = {
    id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: commentInput.name,
    body: commentInput.body,
    rating: commentInput.rating,
    createdAt: new Date().toISOString(),
  };

  if (process.env.GITHUB_TOKEN) {
    const file = await readGitHubComments();
    const next = { ...file.json };
    next[commentInput.slug] = [comment, ...(next[commentInput.slug] || [])].slice(0, 80);
    await writeGitHubComments(next, file.sha, `Add comment for ${commentInput.slug}`);
    return comment;
  }

  if (process.env.VERCEL) {
    const error = new Error("Yorumlar için GITHUB_TOKEN eksik olduğu için canlıda kalıcı yazılamıyor.");
    error.statusCode = 409;
    throw error;
  }

  const current = await readLocalComments();
  current[commentInput.slug] = [comment, ...(current[commentInput.slug] || [])].slice(0, 80);
  await writeLocalComments(current);
  return comment;
}
