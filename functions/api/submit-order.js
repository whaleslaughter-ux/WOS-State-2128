export async function onRequestPost({ request }) {
  const data = await request.json();

  const res = await fetch(
    'https://script.google.com/macros/s/AKfycbybmxe-dbKeru59gp0fmiaH_j8_fofOIju_wFOCWV2SaGfd8D1KiIMxVI53uAKqbPm8/exec',
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
