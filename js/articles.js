function articleViewerUrl(file, title, base) {
  const params = new URLSearchParams({ file, title: title || 'Article' });
  return `${base}Articles/read.html?${params.toString()}`;
}

async function fetchArticles(base) {
  const root = base ?? getArticlesBase();
  try {
    const res = await fetch(`${root}Articles/articles.json`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.articles || [];
  } catch {
    return [];
  }
}

function getArticlesBase() {
  const script = document.currentScript;
  return script?.dataset?.base || '';
}

function articleCardHtml(article, base) {
  const isExternal = article.external && article.url;
  const href = isExternal
    ? article.url
    : articleViewerUrl(article.file, article.title, base);
  const linkText = isExternal ? 'Visit Source →' : 'Read Article →';
  const tagClass = article.tag === 'External' ? ' ext' : '';
  const target = isExternal ? ' target="_blank" rel="noopener"' : '';

  return `
    <div class="article-card">
      <span class="article-tag${tagClass}">${article.tag}</span>
      <div class="article-title">${article.title}</div>
      <p class="article-desc">${article.desc}</p>
      <a href="${href}" class="article-link"${target}>${linkText}</a>
    </div>`;
}

async function appendClubArticles(gridSelector, field, base) {
  const grid = document.querySelector(gridSelector);
  if (!grid) return;

  const articles = await fetchArticles(base);
  const mine = articles.filter((a) => a.field === field);
  if (!mine.length) return;

  grid.insertAdjacentHTML('beforeend', mine.map((a) => articleCardHtml(a, base)).join(''));
}

async function renderAllArticles(containerSelector, base) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const articles = await fetchArticles(base);
  if (!articles.length) {
    container.innerHTML = '<p class="article-empty">No articles published yet.</p>';
    return;
  }

  container.innerHTML = articles.map((a) => articleCardHtml(a, base)).join('');
}
