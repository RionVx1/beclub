// GitHub API module for admin panel
// Handles GitHub file uploads, deletions, and simple helpers used by admin

/**
 * Configuration for repository paths and branch used by the admin UI.
 */
export const GITHUB_CONFIG = {
  owner: "RionVx1",
  repo: "beclub",
  branch: "main",
  articlesDir: "Articles",
  previewDir: "Articles/preview",
};

/**
 * Base64-encode a UTF-8 text string for GitHub API content uploads.
 */
function toBase64Text(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

/**
 * Base64-encode a binary ArrayBuffer for GitHub API.
 */
function toBase64Binary(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function encodeContent(content) {
  if (content instanceof ArrayBuffer) return toBase64Binary(content);
  return toBase64Text(content);
}

/**
 * Low-level wrapper around the GitHub REST API that returns parsed JSON
 * or throws a helpful Error. `path` should include the leading `/`.
 */
async function githubApi(token, path, options = {}) {
  if (!token) throw new Error("Enter your GitHub token to upload.");

  try {
    const res = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `GitHub API error (${res.status})`);
    }
    return data;
  } catch (err) {
    console.error(`GitHub API error for ${path}:`, err);
    throw err;
  }
}

export async function getFileSha(token, filePath) {
  try {
    const { owner, repo, branch } = GITHUB_CONFIG;
    const data = await githubApi(
      token,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`,
    );
    return data.sha;
  } catch (err) {
    console.error(`Failed to get file SHA for ${filePath}:`, err);
    return null;
  }
}

export async function uploadToGithub(token, filePath, content, message) {
  try {
    const { owner, repo, branch } = GITHUB_CONFIG;
    const sha = await getFileSha(token, filePath);
    const body = {
      message,
      content: encodeContent(content),
      branch,
    };
    if (sha) body.sha = sha;

    return await githubApi(
      token,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  } catch (err) {
    console.error(`Failed to upload ${filePath}:`, err);
    throw err;
  }
}

export async function deleteFromGithub(token, filePath, message) {
  try {
    const { owner, repo, branch } = GITHUB_CONFIG;
    const sha = await getFileSha(token, filePath);
    if (!sha) return;

    return await githubApi(
      token,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sha, branch }),
      },
    );
  } catch (err) {
    console.error(`Failed to delete ${filePath}:`, err);
    throw err;
  }
}

export async function uploadArticle(
  token,
  articlePath,
  fileContent,
  previewPath,
  previewContent,
  manifestContent,
  title,
) {
  try {
    const manifestPath = `${GITHUB_CONFIG.articlesDir}/articles.json`;
    await uploadToGithub(
      token,
      articlePath,
      fileContent,
      `Add article: ${title}`,
    );
    await uploadToGithub(
      token,
      previewPath,
      previewContent,
      `Add article preview: ${title}`,
    );
    await uploadToGithub(
      token,
      manifestPath,
      manifestContent,
      `Update articles list: ${title}`,
    );
  } catch (err) {
    console.error(`Failed to upload article ${title}:`, err);
    throw err;
  }
}

export async function removeArticleFromGithub(
  token,
  articleFile,
  manifestContent,
  title,
  previewFilenameFromPdf,
) {
  try {
    const manifestPath = `${GITHUB_CONFIG.articlesDir}/articles.json`;
    const articlePath = `${GITHUB_CONFIG.articlesDir}/${articleFile}`;
    const previewPath = `${GITHUB_CONFIG.previewDir}/${previewFilenameFromPdf(articleFile)}`;

    await uploadToGithub(
      token,
      manifestPath,
      manifestContent,
      `Remove article from list: ${title}`,
    );
    await deleteFromGithub(token, articlePath, `Delete article: ${title}`);
    await deleteFromGithub(
      token,
      previewPath,
      `Delete article preview: ${title}`,
    );
  } catch (err) {
    console.error(`Failed to remove article ${title}:`, err);
    throw err;
  }
}

export function getGithubToken() {
  const input = document.getElementById("github-token");
  return input ? input.value.trim() : "";
}
