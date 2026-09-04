export async function onRequestPost({ request }) {
  const data = await request.json();

  const res = await fetch(
    'https://script.google.com/macros/s/AKfycbwYByTa24Yd4WX97uozPPT7y-8lOyLxdar-jP8HYfGLb0rm8Tw9o8o7Z7T3L0revXkJ/exec',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }
  );

  const result = await res.json();

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}
