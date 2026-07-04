/**
 * Article Management Module
 * Handles uploading and removing articles from GitHub
 */

async function uploadArticle(
  token,
  articlePath,
  fileContent,
  previewPath,
  previewContent,
  manifestContent,
  title,
) {
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
}

async function removeArticleFromGithub(
  token,
  articleFile,
  manifestContent,
  title,
) {
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
}
