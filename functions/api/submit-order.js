export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const code = (data.payment_code || '').trim();

    // 1. Reject empty payment codes
    if (!code) {
      return jsonRes({ status: 'error', message: 'Missing payment code.' });
    }

    // 2. Sanitize inputs
    const clean = str => String(str || '').replace(/<[^>]*>/g, '').trim();
    data.name = clean(data.name);
    data.alliance = clean(data.alliance);
    data.title = clean(data.title);
    data.description = clean(data.description);
    data.setting = clean(data.setting);
    data.extras = clean(data.extras);
    data.motifs = clean(data.motifs);
    data.back_text = clean(data.back_text);

    // 3. Require mandatory fields
    if (!data.name || !data.alliance || !data.title || !data.description) {
      return jsonRes({ status: 'error', message: 'Missing required fields.' });
    }

    // 4. Verify with Stripe (skip grandfathered codes)
    const isGrandfathered = code === 'ORIGINAL' || code.startsWith('PC-');
    if (!isGrandfathered) {
      const stripeKey = env.STRIPE_SECRET_KEY;
      const stripeRes = await fetch(
        'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(code),
        {
          headers: { 'Authorization': 'Basic ' + btoa(stripeKey + ':') }
        }
      );
      const session = await stripeRes.json();

      if (!stripeRes.ok || (session.payment_status !== 'paid' && session.amount_total !== 0)) {
        return jsonRes({ status: 'error', message: 'Payment not verified.' });
      }
    }

    // 5. Send to Apps Script (it handles duplicate check + row write)
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwYByTa24Yd4WX97uozPPT7y-8lOyLxdar-jP8HYfGLb0rm8Tw9o8o7Z7T3L0revXkJ/exec';
    const scriptRes = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const scriptResult = await scriptRes.json();

    if (scriptResult.status !== 'ok') {
      return jsonRes(scriptResult);
    }

    // 6. Poke Make.com
    const makeToken = env.MAKE_API_TOKEN;
    const makeScenarioId = env.MAKE_SCENARIO_ID;
    await fetch(
      'https://us2.make.com/api/v2/scenarios/' + makeScenarioId + '/run',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + makeToken,
          'Content-Type': 'application/json'
        }
      }
    );

    return jsonRes({ status: 'ok' });

  } catch (err) {
    return jsonRes({ status: 'error', message: 'Server error. Please try again.' });
  }
}

function jsonRes(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { 'Content-Type': 'application/json' }
  });
}
