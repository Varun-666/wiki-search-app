const brandBtn = document.getElementById('brand-btn');
const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const clearBtn = document.getElementById('clear-btn');
const themeToggle = document.getElementById('theme-toggle');

const emptyState = document.getElementById('empty-state');
const statusEl = document.getElementById('status');
const skeletonLoader = document.getElementById('skeleton-loader');
const resultsEl = document.getElementById('results');

// Article view elements
const articleLayout = document.getElementById('article-layout');
const tocSidebar = document.getElementById('toc-sidebar');
const tocList = document.getElementById('toc-list');
const backBtn = document.getElementById('back-btn');
const articleMeta = document.getElementById('article-meta');
const articleTitle = document.getElementById('article-title');
const articleCategories = document.getElementById('article-categories');
const articleFigure = document.getElementById('article-figure');
const articleImage = document.getElementById('article-image');
const articleContent = document.getElementById('article-content');
const scrollTopBtn = document.getElementById('scroll-top-btn');

let lastStatusText = '';

/* ===== 1. Dark / Light Theme Management ===== */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('wikiatlas-theme', theme);
}

const savedTheme =
  localStorage.getItem('wikiatlas-theme') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ===== 2. Search Input UX & Keyboard Shortcut (/) ===== */
input.addEventListener('input', () => {
  clearBtn.classList.toggle('hidden', input.value.length === 0);
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  clearBtn.classList.add('hidden');
  input.focus();
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== input) {
    e.preventDefault();
    input.focus();
    input.select();
  }
});

/* ===== 3. Brand Home Reset & Suggestion Chips ===== */
brandBtn.addEventListener('click', () => {
  articleLayout.classList.add('hidden');
  resultsEl.innerHTML = '';
  resultsEl.classList.add('hidden');
  statusEl.textContent = '';
  emptyState.classList.remove('hidden');
  input.value = '';
  clearBtn.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelectorAll('.topic-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const query = chip.dataset.query;
    input.value = query;
    clearBtn.classList.remove('hidden');
    performSearch(query);
  });
});

/* ===== 4. Skeleton Loaders ===== */
function showSearchSkeleton() {
  skeletonLoader.innerHTML = `
    <div class="skeleton-wrap">
      ${Array.from({ length: 4 })
        .map(
          () => `
        <div class="skeleton-card">
          <div class="skeleton-box skeleton-thumb"></div>
          <div class="skeleton-lines">
            <div class="skeleton-box skeleton-line title"></div>
            <div class="skeleton-box skeleton-line"></div>
            <div class="skeleton-box skeleton-line short"></div>
          </div>
        </div>`
        )
        .join('')}
    </div>`;
  skeletonLoader.classList.remove('hidden');
}

function showArticleSkeleton() {
  skeletonLoader.innerHTML = `
    <div class="skeleton-wrap">
      <div class="article-card">
        <div class="skeleton-lines">
          <div class="skeleton-box skeleton-line title"></div>
          <div class="skeleton-box skeleton-line"></div>
          <div class="skeleton-box skeleton-line"></div>
          <div class="skeleton-box skeleton-line short"></div>
          <div class="skeleton-box skeleton-line" style="height: 220px; margin-top: 1rem;"></div>
        </div>
      </div>
    </div>`;
  skeletonLoader.classList.remove('hidden');
}

function hideSkeleton() {
  skeletonLoader.classList.add('hidden');
  skeletonLoader.innerHTML = '';
}

/* ===== 5. Search Flow ===== */
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (query) performSearch(query);
});

async function performSearch(query) {
  emptyState.classList.add('hidden');
  articleLayout.classList.add('hidden');
  resultsEl.classList.add('hidden');
  resultsEl.innerHTML = '';
  statusEl.textContent = '';
  showSearchSkeleton();

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    hideSkeleton();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    if (data.results.length === 0) {
      lastStatusText = `No results found for "${query}". Try a different keyword.`;
      statusEl.textContent = lastStatusText;
      return;
    }

    lastStatusText = `Found ${data.count} results for "${data.query}"`;
    statusEl.textContent = lastStatusText;
    resultsEl.classList.remove('hidden');

    data.results.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.addEventListener('click', () => loadArticle(item.id));

      if (item.thumbnail) {
        const img = document.createElement('img');
        img.className = 'card-thumb';
        img.src = item.thumbnail;
        img.alt = item.title;
        card.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'card-thumb-placeholder';
        placeholder.textContent = item.title.charAt(0).toUpperCase();
        card.appendChild(placeholder);
      }

      const body = document.createElement('div');
      body.className = 'card-body';

      const titleBtn = document.createElement('button');
      titleBtn.type = 'button';
      titleBtn.className = 'result-title-btn';
      titleBtn.textContent = item.title;

      const summary = document.createElement('p');
      summary.textContent = item.summary;

      body.appendChild(titleBtn);
      body.appendChild(summary);
      card.appendChild(body);
      resultsEl.appendChild(card);
    });
  } catch (err) {
    hideSkeleton();
    statusEl.textContent = `Error: ${err.message}`;
  }
}

/* ===== 6. Full Article Reader + Auto Table of Contents ===== */
async function loadArticle(pageId) {
  resultsEl.classList.add('hidden');
  articleLayout.classList.add('hidden');
  statusEl.textContent = '';
  showArticleSkeleton();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  try {
    const response = await fetch(`/api/article?id=${encodeURIComponent(pageId)}`);
    const article = await response.json();
    hideSkeleton();

    if (!response.ok) {
      throw new Error(article.error || 'Could not load article');
    }

    articleTitle.textContent = article.title;

    // Categories
    articleCategories.innerHTML = '';
    article.categories.forEach((cat) => {
      const tag = document.createElement('span');
      tag.className = 'category-tag';
      tag.textContent = cat;
      articleCategories.appendChild(tag);
    });

    // Hero Image
    if (article.image) {
      articleImage.src = article.image;
      articleImage.alt = article.title;
      articleFigure.classList.remove('hidden');
    } else {
      articleFigure.classList.add('hidden');
    }

    // Article HTML
    articleContent.innerHTML = article.contentHtml;

    // Reading Time Estimate
    const wordCount = (articleContent.textContent || '').trim().split(/\s+/).length;
    const readMinutes = Math.max(1, Math.ceil(wordCount / 200));
    articleMeta.textContent = `${wordCount.toLocaleString()} words • ${readMinutes} min read`;

    // Build Table of Contents from <h2> headings
    buildTableOfContents();

    articleLayout.classList.remove('hidden');
  } catch (err) {
    hideSkeleton();
    statusEl.textContent = `Error: ${err.message}`;
    resultsEl.classList.remove('hidden');
  }
}

function buildTableOfContents() {
  tocList.innerHTML = '';
  const headings = articleContent.querySelectorAll('h2');

  if (headings.length === 0) {
    tocSidebar.classList.add('hidden');
    return;
  }

  headings.forEach((heading, index) => {
    const id = `section-${index}`;
    heading.id = id;

    const link = document.createElement('a');
    link.className = 'toc-link';
    link.href = `#${id}`;
    link.textContent = heading.textContent;
    tocList.appendChild(link);
  });

  tocSidebar.classList.remove('hidden');
}

/* ===== 7. Back Button & Scroll-to-Top ===== */
backBtn.addEventListener('click', () => {
  articleLayout.classList.add('hidden');
  resultsEl.classList.remove('hidden');
  statusEl.textContent = lastStatusText;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('hidden', window.scrollY < 400);
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});