export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const code = (data.payment_code || '').trim();

    if (!code) {
      return jsonRes({ status: 'error', message: 'Missing payment code.' });
    }

    const clean = str => String(str || '').replace(/<[^>]*>/g, '').trim();
    data.name = clean(data.name);
    data.alliance = clean(data.alliance);
    data.title = clean(data.title);
    data.description = clean(data.description);
    data.setting = clean(data.setting);
    data.extras = clean(data.extras);
    data.motifs = clean(data.motifs);
    data.back_text = clean(data.back_text);

    if (!data.name || !data.alliance || !data.title || !data.description) {
      return jsonRes({ status: 'error', message: 'Missing required fields.' });
    }

    const isGrandfathered = code === 'ORIGINAL' || code.startsWith('PC-');
    if (!isGrandfathered) {
      const stripeKey = env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return jsonRes({ status: 'error', message: 'Server config error: missing Stripe key.' });
      }
      const stripeRes = await fetch(
        'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(code),
        {
          headers: { 'Authorization': 'Basic ' + btoa(stripeKey + ':') }
        }
      );
      const session = await stripeRes.json();

      if (!stripeRes.ok || (session.payment_status !== 'paid' && session.amount_total !== 0)) {
        return jsonRes({ status: 'error', message: 'STOP YOU FIEND. PAYMENT NOT VERIFIED.' });
      }
    }

    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwYByTa24Yd4WX97uozPPT7y-8lOyLxdar-jP8HYfGLb0rm8Tw9o8o7Z7T3L0revXkJ/exec';
    const scriptRes = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const scriptText = await scriptRes.text();

    let scriptResult;
    try {
      scriptResult = JSON.parse(scriptText);
    } catch {
      return jsonRes({ status: 'error', message: 'Apps Script returned invalid response: ' + scriptText.substring(0, 200) });
    }

    if (scriptResult.status !== 'ok') {
      return jsonRes(scriptResult);
    }

    const makeToken = env.MAKE_API_TOKEN;
    const makeScenarioId = env.MAKE_SCENARIO_ID;

    if (!makeToken || !makeScenarioId) {
      return jsonRes({ status: 'ok', warning: 'Card saved but auto-generation failed: missing Make.com config.' });
    }

    const makeRes = await fetch(
      'https://us2.make.com/api/v2/scenarios/' + makeScenarioId + '/start',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + makeToken,
          'Content-Type': 'application/json'
        }
      }
    );
    const makeText = await makeRes.text();

    if (!makeRes.ok) {
      return jsonRes({ status: 'ok', warning: 'Card saved but Make.com poke failed (' + makeRes.status + '): ' + makeText.substring(0, 200) });
    }

    return jsonRes({ status: 'ok' });

  } catch (err) {
    return jsonRes({ status: 'error', message: 'Server error: ' + err.message });
  }
}

function jsonRes(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { 'Content-Type': 'application/json' }
  });
}
