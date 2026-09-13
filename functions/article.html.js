// functions/article.html.js
// Intercepts article page requests and injects Open Graph meta tags
// AND server-rendered article content so crawlers see real data
// instead of "Loading… — WOS State 2128"

export async function onRequest(context) {
  var { request, next } = context;
  var url = new URL(request.url);
  var id = url.searchParams.get('id');

  // No article ID — just serve the page as-is
  if (!id) return next();

  // Fetch the static page and news.json in parallel
  var [pageRes, jsonRes] = await Promise.all([
    next(),
    fetch(new URL('/news.json', url.origin))
  ]);

  // If either fetch fails, fall through to the static page
  if (!pageRes.ok || !jsonRes.ok) return pageRes;

  var articles = await jsonRes.json();
  var article = articles.find(function(a) { return a.id === id; });

  // Article not found in JSON — serve page as-is (it'll show the not-found UI)
  if (!article) return pageRes;

  // Build clean description from blurb
  var description = article.blurb
    ? article.blurb
        .replace(/<[^>]*>/g, '')
        .replace(/&mdash;/g, '\u2014')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200)
    : 'WOS State 2128 news article';

  var title = article.title + ' \u2014 WOS State 2128';
  var image = article.img
    ? (article.img.startsWith('http') ? article.img : url.origin + article.img)
    : url.origin + '/web-app-manifest-512x512.png';
  var articleUrl = url.origin + '/article.html?id=' + encodeURIComponent(id);

  // Meta tags for SEO and social previews
  var ogTags = '<title>' + escHtml(title) + '</title>\n'
    + '<meta name="description" content="' + escAttr(description) + '" />\n'
    + '<link rel="canonical" href="' + escAttr(articleUrl) + '" />\n'
    + '<meta property="og:type" content="article" />\n'
    + '<meta property="og:title" content="' + escAttr(article.title) + '" />\n'
    + '<meta property="og:description" content="' + escAttr(description) + '" />\n'
    + '<meta property="og:image" content="' + escAttr(image) + '" />\n'
    + '<meta property="og:url" content="' + escAttr(articleUrl) + '" />\n'
    + '<meta property="og:site_name" content="2128 News \u2014 WOS State 2128" />\n'
    + '<meta property="article:published_time" content="' + escAttr(article.date) + '" />\n'
    + '<meta property="article:author" content="' + escAttr(article.reporter) + '" />\n'
    + '<meta name="twitter:card" content="summary_large_image" />\n'
    + '<meta name="twitter:title" content="' + escAttr(article.title) + '" />\n'
    + '<meta name="twitter:description" content="' + escAttr(description) + '" />\n'
    + '<meta name="twitter:image" content="' + escAttr(image) + '" />\n';

  // Structured data for search engines
  var jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "image": image,
    "datePublished": article.date,
    "author": { "@type": "Person", "name": article.reporter },
    "publisher": {
      "@type": "Organization",
      "name": "2128 News",
      "url": url.origin
    },
    "description": description,
    "mainEntityOfPage": articleUrl
  });

  ogTags += '<script type="application/ld+json">' + jsonLd + '</script>\n';

  // Server-rendered article content for crawlers that don't run JS
  var renderedArticle = '<div id="ssr-article">'
    + '<h1>' + escHtml(article.title) + '</h1>'
    + '<p>By ' + escHtml(article.reporter) + ' \u00b7 ' + article.date + '</p>'
    + article.blurb
    + '</div>';

  // Rewrite the HTML: swap meta, inject content
  return new HTMLRewriter()
    .on('title', {
      element: function(el) { el.remove(); }
    })
    .on('meta[name="description"]', {
      element: function(el) { el.remove(); }
    })
    .on('head', {
      element: function(el) { el.append(ogTags, { html: true }); }
    })
    .on('#article-root', {
      element: function(el) { el.append(renderedArticle, { html: true }); }
    })
    .transform(pageRes);
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
