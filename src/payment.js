import { calculateCart } from './catalog.js';

const MP_API = 'https://api.mercadopago.com';

function headers(extra = {}) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

export async function createPixPayment(order) {
  const totals = calculateCart(order.cart);
  const body = {
    transaction_amount: Number(totals.total.toFixed(2)),
    description: `Pedido ${order.id} - ${process.env.STORE_NAME || 'Moah Açaí'}`,
    payment_method_id: 'pix',
    external_reference: order.id,
    notification_url: `${process.env.BASE_URL}/mercadopago/webhook`,
    payer: { email: process.env.DEFAULT_PAYER_EMAIL || 'cliente@moahacai.com.br' }
  };

  const response = await fetch(`${MP_API}/v1/payments`, {
    method: 'POST',
    headers: headers({ 'X-Idempotency-Key': `pix-${order.id}` }),
    body: JSON.stringify(body)
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`Erro Mercado Pago Pix: ${JSON.stringify(json)}`);
  return {
    paymentId: String(json.id),
    status: json.status,
    qrCode: json.point_of_interaction?.transaction_data?.qr_code,
    qrCodeBase64: json.point_of_interaction?.transaction_data?.qr_code_base64,
    ticketUrl: json.point_of_interaction?.transaction_data?.ticket_url
  };
}

export async function createCardCheckout(order) {
  const totals = calculateCart(order.cart);
  const body = {
    external_reference: order.id,
    notification_url: `${process.env.BASE_URL}/mercadopago/webhook`,
    items: [{
      title: `Pedido ${order.id} - ${process.env.STORE_NAME || 'Moah Açaí'}`,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: Number(totals.total.toFixed(2))
    }],
    back_urls: {
      success: `${process.env.BASE_URL}/pedido/${order.id}/sucesso`,
      pending: `${process.env.BASE_URL}/pedido/${order.id}/pendente`,
      failure: `${process.env.BASE_URL}/pedido/${order.id}/falha`
    },
    auto_return: 'approved'
  };

  const response = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body)
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`Erro Mercado Pago Cartão: ${JSON.stringify(json)}`);
  return { preferenceId: json.id, initPoint: json.init_point, sandboxInitPoint: json.sandbox_init_point };
}

export async function getPayment(paymentId) {
  const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, { headers: headers() });
  const json = await response.json();
  if (!response.ok) throw new Error(`Erro ao consultar pagamento: ${JSON.stringify(json)}`);
  return json;
}
