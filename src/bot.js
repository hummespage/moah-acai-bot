import { v4 as uuidv4 } from 'uuid';
import { sendText } from './whatsapp.js';
import { menu, deliveryAreas, money, byId, parseNumbers, listReadyProducts, listSizesFor, listFruits, listComplements, listSpecials, listAreas, calculateCart, orderSummary } from './catalog.js';
import { saveOrder, findOrder } from './storage.js';
import { createPixPayment, createCardCheckout } from './payment.js';

const sessions = new Map();

function freshSession(phone) {
  const s = { phone, step: 'START', cart: {} };
  sessions.set(phone, s);
  return s;
}

function menuInicial() {
  return `🍇 *Moah Açaí*\nEnergia que vem do sabor!\n\nComo você quer pedir?\n\n1. Açaís prontos\n2. Monte seu Açaí\n3. Monte seu Cupuaçu\n\nDigite o número da opção.\n\nA qualquer momento digite *cancelar* para recomeçar.`;
}

async function askSize(s) {
  await sendText(s.phone, `Escolha o tamanho:\n\n${listSizesFor(s.currentPrices)}`);
  s.step = 'SIZE';
}

async function askDelivery(s) {
  await sendText(s.phone, `Agora escolha o bairro da entrega digitando o número:\n\n${listAreas()}`);
  s.step = 'DELIVERY';
}

async function createOrderAndPayment(s, method) {
  const order = saveOrder({
    id: uuidv4().slice(0, 8).toUpperCase(),
    customerPhone: s.phone,
    cart: { ...s.cart, paymentMethod: method },
    status: 'awaiting_payment',
    createdAt: new Date().toISOString()
  });

  try {
    if (method === 'pix') {
      const pix = await createPixPayment(order);
      order.payment = { method, ...pix };
      saveOrder(order);
      await sendText(s.phone, `✅ Pedido gerado!\n\n${orderSummary(order.cart, true)}\n\n💜 *Pix copia e cola:*\n${pix.qrCode}\n\nAssim que o pagamento for confirmado, o pedido vai automaticamente para a loja.`);
      return;
    }

    const card = await createCardCheckout(order);
    order.payment = { method, ...card };
    saveOrder(order);
    await sendText(s.phone, `✅ Pedido gerado!\n\n${orderSummary(order.cart, true)}\n\n💳 Pague com cartão pelo link:\n${card.initPoint}\n\nAssim que o pagamento for confirmado, o pedido vai automaticamente para a loja.`);
  } catch (err) {
    console.error(err);
    await sendText(s.phone, `Opa, deu erro ao gerar o pagamento. A loja já pode conferir a configuração do Mercado Pago.\n\nErro: ${err.message}`);
  }
}

export async function handleIncomingText(phone, textRaw) {
  const text = String(textRaw || '').trim();
  const lower = text.toLowerCase();
  if (!text) return;

  if (['oi', 'olá', 'ola', 'menu', 'iniciar', 'começar', 'comecar', 'cancelar'].includes(lower)) {
    const s = freshSession(phone);
    await sendText(phone, menuInicial());
    s.step = 'MAIN';
    return;
  }

  const s = sessions.get(phone) || freshSession(phone);

  switch (s.step) {
    case 'START':
    case 'MAIN': {
      if (text === '1') {
        await sendText(phone, `Escolha uma opção pronta:\n\n${listReadyProducts()}`);
        s.step = 'READY_PRODUCT';
      } else if (text === '2' || text === '3') {
        const product = menu.buildYourOwn.find(p => p.id === (text === '2' ? 1 : 2));
        s.cart = { productName: product.name, productType: product.type, complements: [], specials: [] };
        s.currentPrices = product.prices;
        await askSize(s);
      } else {
        await sendText(phone, `Não entendi 😅\n\n${menuInicial()}`);
        s.step = 'MAIN';
      }
      break;
    }

    case 'READY_PRODUCT': {
      const product = byId(menu.readyProducts, Number(text));
      if (!product) return sendText(phone, `Escolha uma opção válida:\n\n${listReadyProducts()}`);
      s.selectedReady = product;
      s.cart = { productName: product.name, productDescription: product.description, complements: [], specials: [] };
      s.currentPrices = product.prices;
      await askSize(s);
      break;
    }

    case 'SIZE': {
      const size = byId(menu.sizes, Number(text));
      if (!size) return sendText(phone, `Escolha 1 ou 2:\n\n${listSizesFor(s.currentPrices)}`);
      s.cart.sizeName = size.name;
      s.cart.sizeKey = size.key;
      s.cart.itemPrice = s.currentPrices[size.key];

      if (s.selectedReady?.askFruit) {
        await sendText(phone, `Escolha a fruta:\n\n${listFruits()}`);
        s.step = 'FRUIT';
      } else if (s.cart.productType) {
        await sendText(phone, `Escolha os complementos de R$ 4,99 cada.\n\nDigite os números separados por vírgula. Ex: 1,2,4\nDigite 0 para nenhum.\n\n${listComplements()}`);
        s.step = 'COMPLEMENTS';
      } else {
        await askDelivery(s);
      }
      break;
    }

    case 'FRUIT': {
      const fruit = menu.fruits[Number(text) - 1];
      if (!fruit) return sendText(phone, `Escolha uma fruta válida:\n\n${listFruits()}`);
      s.cart.fruit = fruit;
      await askDelivery(s);
      break;
    }

    case 'COMPLEMENTS': {
      const nums = parseNumbers(text);
      if (nums.includes(0)) s.cart.complements = [];
      else s.cart.complements = nums.map(n => byId(menu.complements, n)).filter(Boolean);
      await sendText(phone, `Quer adicionar algum especial?\n\n${listSpecials()}\n\nPode digitar mais de um separado por vírgula.`);
      s.step = 'SPECIALS';
      break;
    }

    case 'SPECIALS': {
      const nums = parseNumbers(text);
      if (nums.includes(0)) s.cart.specials = [];
      else s.cart.specials = nums.map(n => byId(menu.specials, n)).filter(Boolean);
      await askDelivery(s);
      break;
    }

    case 'DELIVERY': {
      const area = byId(deliveryAreas, Number(text));
      if (!area) return sendText(phone, `Escolha um bairro válido pelo número:\n\n${listAreas()}`);
      s.cart.deliveryArea = area;
      await sendText(phone, `Agora manda o endereço completo com número e complemento.\n\nEx: Rua X, 123, casa azul, perto da padaria.`);
      s.step = 'ADDRESS';
      break;
    }

    case 'ADDRESS': {
      s.cart.address = text;
      await sendText(phone, `${orderSummary(s.cart)}\n\nConfirma o pedido?\n1. Sim\n2. Alterar/recomeçar`);
      s.step = 'CONFIRM';
      break;
    }

    case 'CONFIRM': {
      if (text === '1') {
        await sendText(phone, `Forma de pagamento:\n\n1. Pix\n2. Cartão de crédito`);
        s.step = 'PAYMENT_METHOD';
      } else if (text === '2') {
        freshSession(phone).step = 'MAIN';
        await sendText(phone, menuInicial());
      } else {
        await sendText(phone, `Digite 1 para confirmar ou 2 para alterar.`);
      }
      break;
    }

    case 'PAYMENT_METHOD': {
      if (text === '1') await createOrderAndPayment(s, 'pix');
      else if (text === '2') await createOrderAndPayment(s, 'card');
      else return sendText(phone, `Digite 1 para Pix ou 2 para Cartão.`);
      sessions.delete(phone);
      break;
    }

    default:
      freshSession(phone).step = 'MAIN';
      await sendText(phone, menuInicial());
  }
}

export async function markOrderPaid(orderId, paymentInfo = {}) {
  const order = findOrder(orderId);
  if (!order || order.status === 'paid') return order;
  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  order.payment = { ...(order.payment || {}), ...paymentInfo };
  saveOrder(order);

  await sendText(order.customerPhone, `✅ Pagamento confirmado!\nSeu pedido foi enviado para a loja. Já já sai pra entrega 💜\n\nPedido: *${order.id}*`);

  const owner = process.env.OWNER_WHATSAPP;
  if (owner) {
    await sendText(owner, `🚨 *NOVO PEDIDO PAGO*\n\nPedido: *${order.id}*\nCliente: +${order.customerPhone}\n\n${orderSummary(order.cart, true)}\n\nStatus: ✅ Pago confirmado`);
  }
  return order;
}
