const API_VERSION = 'v22.0';

export async function sendText(to, body) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.log('[WHATSAPP MOCK]', to, body);
    return;
  }

  const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: true, body }
    })
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) console.error('Erro WhatsApp:', response.status, json);
  return json;
}
