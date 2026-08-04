// functions/article.html.js
// Intercepts article page requests and injects Open Graph meta tags
// so crawlers (Google, Discord, Facebook, Twitter) see real article data
// instead of "Loading… — WOS State 2128"

export async function onRequest(context) {
  var { request, next, env } = context;
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

  // Build the meta tags
  var title = article.title + ' — WOS State 2128';
  var description = article.blurb
    ? article.blurb.replace(/<[^>]*>/g, '').substring(0, 200)
    : 'WOS State 2128 news article';
  var image = article.img
    ? (article.img.startsWith('http') ? article.img : url.origin + article.img)
    : url.origin + '/web-app-manifest-512x512.png';
  var articleUrl = url.origin + '/article.html?id=' + encodeURIComponent(id);

  var ogTags = '<title>' + escHtml(title) + '</title>\n'
    + '<meta name="description" content="' + escAttr(description) + '" />\n'
    + '<meta property="og:type" content="article" />\n'
    + '<meta property="og:title" content="' + escAttr(article.title) + '" />\n'
    + '<meta property="og:description" content="' + escAttr(description) + '" />\n'
    + '<meta property="og:image" content="' + escAttr(image) + '" />\n'
    + '<meta property="og:url" content="' + escAttr(articleUrl) + '" />\n'
    + '<meta property="og:site_name" content="2128 News — WOS State 2128" />\n'
    + '<meta name="twitter:card" content="summary_large_image" />\n'
    + '<meta name="twitter:title" content="' + escAttr(article.title) + '" />\n'
    + '<meta name="twitter:description" content="' + escAttr(description) + '" />\n'
    + '<meta name="twitter:image" content="' + escAttr(image) + '" />\n';

  // Use HTMLRewriter to inject tags and replace the title
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
    .transform(pageRes);
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
