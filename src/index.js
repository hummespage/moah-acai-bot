import 'dotenv/config';
import express from 'express';
import { ensureRuntime, findOrder } from './storage.js';
import { handleIncomingText, markOrderPaid } from './bot.js';
import { getPayment } from './payment.js';

ensureRuntime();
const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/', (_req, res) => res.send('Moah Açaí Bot online ✅'));
app.get('/health', (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const entries = req.body.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        for (const msg of messages) {
          const from = msg.from;
          const text = msg.text?.body;
          if (from && text) await handleIncomingText(from, text);
        }
      }
    }
  } catch (err) {
    console.error('Erro webhook WhatsApp:', err);
  }
});

app.post('/mercadopago/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const type = req.body.type || req.body.action;
    const paymentId = req.body?.data?.id || req.query['data.id'] || req.query.id;
    if (!String(type).includes('payment') || !paymentId) return;

    const payment = await getPayment(paymentId);
    const orderId = payment.external_reference;
    if (payment.status === 'approved' && orderId) {
      await markOrderPaid(orderId, {
        mercadoPagoPaymentId: String(payment.id),
        status: payment.status,
        statusDetail: payment.status_detail
      });
    }
  } catch (err) {
    console.error('Erro webhook Mercado Pago:', err);
  }
});

app.get('/pedido/:id/sucesso', (req, res) => {
  const order = findOrder(req.params.id);
  res.send(`<h1>Pagamento recebido</h1><p>Pedido ${req.params.id}. Pode voltar ao WhatsApp.</p><pre>${order ? JSON.stringify(order, null, 2) : ''}</pre>`);
});
app.get('/pedido/:id/pendente', (req, res) => res.send(`<h1>Pagamento pendente</h1><p>Pedido ${req.params.id}. Aguarde a confirmação.</p>`));
app.get('/pedido/:id/falha', (req, res) => res.send(`<h1>Pagamento não concluído</h1><p>Pedido ${req.params.id}. Volte ao WhatsApp e tente novamente.</p>`));

// Rota manual de emergência para marcar pedido como pago pelo navegador, se precisar testar.
app.post('/admin/orders/:id/mark-paid', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) return res.sendStatus(403);
  const order = await markOrderPaid(req.params.id, { manual: true });
  res.json({ ok: Boolean(order), order });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Moah Açaí Bot rodando na porta ${port}`));
