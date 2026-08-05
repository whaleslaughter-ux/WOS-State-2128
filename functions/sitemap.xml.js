// functions/sitemap.xml.js

export async function onRequest(context) {
  const base = 'https://2128.whaleslaughter.com';
  const today = new Date().toISOString().split('T')[0];

  // Fetch news.json from the site itself
  const res = await context.env.ASSETS.fetch(new URL('/news.json', context.request.url));
  const articles = await res.json();

  const staticPages = [
    { path: '/', priority: '1.0' },
    { path: '/news.html', priority: '0.9' },
    { path: '/presidents.html', priority: '0.7' },
    { path: '/players.html', priority: '0.6' },
    { path: '/throat-of-the-frost.html', priority: '0.5' },
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const page of staticPages) {
    xml += '  <url>\n';
    xml += `    <loc>${base}${page.path}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  for (const article of articles) {
    xml += '  <url>\n';
    xml += `    <loc>${base}/article.html?id=${article.id}</loc>\n`;
    xml += `    <lastmod>${article.date}</lastmod>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
