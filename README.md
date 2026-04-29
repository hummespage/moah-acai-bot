# Moah Açaí Bot — WhatsApp + Mercado Pago

Bot pronto para rodar com WhatsApp Cloud API e Mercado Pago, com cardápio, frete por bairro, Pix/cartão e envio automático do pedido pago para o proprietário.

## O que já vem pronto

- Fluxo de atendimento no WhatsApp por números.
- Cardápio Moah Açaí em `data/menu.json`.
- Frete por bairro em `data/delivery.json`.
- Pagamento por Pix via Mercado Pago.
- Link de cartão via Mercado Pago Checkout Pro.
- Webhook de confirmação de pagamento.
- Envio automático do pedido pago para o dono.
- Armazenamento simples em arquivo JSON dentro da pasta `runtime/`.

## Rodar localmente

```bash
npm install
cp .env.example .env
npm run dev
```

Para receber webhooks localmente, use uma URL pública tipo ngrok:

```bash
ngrok http 3000
```

Coloque a URL gerada no `BASE_URL` do `.env`.

## Variáveis do `.env`

```env
PORT=3000
BASE_URL=https://seu-app.onrender.com

WHATSAPP_TOKEN=token_da_meta
WHATSAPP_PHONE_NUMBER_ID=id_do_numero
WHATSAPP_VERIFY_TOKEN=moah_acai_verify_123
OWNER_WHATSAPP=5548992069499

MERCADOPAGO_ACCESS_TOKEN=token_do_mercado_pago
DEFAULT_PAYER_EMAIL=cliente@moahacai.com.br

STORE_NAME=Moah Açaí
STORE_PHONE=5548992069499
ADMIN_SECRET=crie_uma_senha_forte_para_rota_admin
```

## Configurar WhatsApp Cloud API

1. Crie ou acesse o app em Meta for Developers.
2. Ative WhatsApp.
3. Pegue:
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
4. Em Webhooks, configure:
   - Callback URL: `https://seu-app.onrender.com/webhook`
   - Verify token: igual ao `WHATSAPP_VERIFY_TOKEN`
5. Assine o campo `messages`.

## Configurar Mercado Pago

1. Pegue o Access Token da conta Mercado Pago.
2. Coloque em `MERCADOPAGO_ACCESS_TOKEN`.
3. O bot cria Pix e Checkout de cartão automaticamente.
4. O webhook de pagamento usado pelo bot é:
   - `https://seu-app.onrender.com/mercadopago/webhook`

## Deploy barato no Render

1. Crie uma conta no Render.
2. New > Web Service.
3. Suba esse projeto para GitHub e conecte.
4. Configurações:
   - Build command: `npm install`
   - Start command: `npm start`
5. Coloque as variáveis de ambiente no painel do Render.
6. Depois de publicado, copie a URL e atualize `BASE_URL`.

## Cardápio e frete

Fretes ficam em:

```txt
data/delivery.json
```

Cardápio fica em:

```txt
data/menu.json
```

## Teste rápido

Depois de tudo configurado, mande `oi` no WhatsApp conectado.

O bot vai responder com:

1. Açaís prontos
2. Monte seu Açaí
3. Monte seu Cupuaçu

## Observação importante

O pedido só é enviado ao proprietário depois que o Mercado Pago confirmar pagamento aprovado via webhook. Isso evita aceitar comprovante falso.
