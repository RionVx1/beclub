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
    // Create a single commit that adds/updates the article PDF, its preview SVG,
    // and the articles manifest together so they do not race or overwrite each other.
    await uploadMultipleFiles(
      token,
      [
        { path: articlePath, content: fileContent },
        { path: previewPath, content: previewContent },
        { path: manifestPath, content: manifestContent },
      ],
      `Add article: ${title}`,
    );
  } catch (err) {
    console.error(`Failed to upload article ${title}:`, err);
    throw err;
  }
}

/**
 * Upload multiple files in a single Git commit by creating blobs, a new tree,
 * a new commit and updating the branch ref.
 * `files` is an array of { path, content } where content can be string or ArrayBuffer.
 */
export async function uploadMultipleFiles(token, files, message) {
  try {
    const { owner, repo, branch } = GITHUB_CONFIG;

    // Get the current commit for the branch
    const ref = await githubApi(
      token,
      `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    );
    const latestCommitSha = ref.object.sha;

    const latestCommit = await githubApi(
      token,
      `/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
    );
    const baseTreeSha = latestCommit.tree.sha;

    // Create blobs for each file
    const blobPromises = files.map(async (f) => {
      const blob = await githubApi(
        token,
        `/repos/${owner}/${repo}/git/blobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: encodeContent(f.content), encoding: "base64" }),
        },
      );
      return { path: f.path, sha: blob.sha };
    });

    const blobs = await Promise.all(blobPromises);

    // Create a new tree based on the current tree, replacing/adding our blobs
    const tree = blobs.map((b) => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha }));

    const newTree = await githubApi(
      token,
      `/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_tree: baseTreeSha, tree }),
      },
    );

    // Create commit
    const newCommit = await githubApi(
      token,
      `/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, tree: newTree.sha, parents: [latestCommitSha] }),
      },
    );

    // Update branch ref to point to new commit
    await githubApi(
      token,
      `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha: newCommit.sha }),
      },
    );

    return newCommit;
  } catch (err) {
    console.error("Failed to upload multiple files:", err);
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
    // Create a single commit that updates the manifest and removes the article
    // and its preview in one atomic change.
    await commitChanges(
      token,
      /* additions */ [{ path: manifestPath, content: manifestContent }],
      /* deletions */ [articlePath, previewPath],
      `Remove article from list: ${title}`,
    );
  } catch (err) {
    console.error(`Failed to remove article ${title}:`, err);
    throw err;
  }
}

/**
 * Commit a set of additions/updates and deletions in a single commit.
 * - `additions` is an array of { path, content }
 * - `deletions` is an array of path strings to remove
 */
export async function commitChanges(token, additions = [], deletions = [], message) {
  try {
    const { owner, repo, branch } = GITHUB_CONFIG;

    // Get current commit and tree
    const ref = await githubApi(
      token,
      `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    );
    const latestCommitSha = ref.object.sha;

    const latestCommit = await githubApi(
      token,
      `/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
    );
    const baseTreeSha = latestCommit.tree.sha;

    // Fetch the full tree recursively so we can reconstruct it without deleted files
    const baseTree = await githubApi(
      token,
      `/repos/${owner}/${repo}/git/trees/${baseTreeSha}?recursive=1`,
    );

    const additionsMap = new Map();
    // create blobs for additions
    for (const f of additions) {
      const blob = await githubApi(
        token,
        `/repos/${owner}/${repo}/git/blobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: encodeContent(f.content), encoding: "base64" }),
        },
      );
      additionsMap.set(f.path, blob.sha);
    }

    const deletionsSet = new Set(deletions || []);
    const additionsPaths = new Set(additions.map((a) => a.path));

    // Build the new tree entries: include all existing entries except deletions
    // and except those paths that will be overwritten by additions.
    const newTreeEntries = baseTree.tree
      .filter((entry) => !deletionsSet.has(entry.path) && !additionsPaths.has(entry.path))
      .map((entry) => ({ path: entry.path, mode: entry.mode, type: entry.type, sha: entry.sha }));

    // Add/replace additions
    for (const [path, sha] of additionsMap.entries()) {
      newTreeEntries.push({ path, mode: "100644", type: "blob", sha });
    }

    // Create a new tree from our entries
    const newTree = await githubApi(
      token,
      `/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tree: newTreeEntries }),
      },
    );

    // Create commit
    const newCommit = await githubApi(
      token,
      `/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, tree: newTree.sha, parents: [latestCommitSha] }),
      },
    );

    // Update branch ref
    await githubApi(
      token,
      `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha: newCommit.sha }),
      },
    );

    return newCommit;
  } catch (err) {
    console.error("Failed to commit changes:", err);
    throw err;
  }
}

export function getGithubToken() {
  const input = document.getElementById("github-token");
  return input ? input.value.trim() : "";
}
