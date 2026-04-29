import fs from 'fs';

export const menu = JSON.parse(fs.readFileSync('data/menu.json', 'utf8'));
export const deliveryAreas = JSON.parse(fs.readFileSync('data/delivery.json', 'utf8'));

export const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const parseNumbers = (text) => String(text || '').split(/[,.\s]+/).map((x) => Number(x)).filter(Boolean);
export const byId = (arr, id) => arr.find((x) => x.id === Number(id));

export function listReadyProducts() {
  return menu.readyProducts.map(p => `${p.id}. ${p.name}\n   300ml ${money(p.prices['300'])} | 500ml ${money(p.prices['500'])}`).join('\n');
}

export function listSizesFor(prices) {
  return menu.sizes.map(s => `${s.id}. ${s.name} — ${money(prices[s.key])}`).join('\n');
}

export function listFruits() {
  return menu.fruits.map((f, i) => `${i + 1}. ${f}`).join('\n');
}

export function listComplements() {
  return menu.complements.map(c => `${c.id}. ${c.name} — ${money(c.price)}`).join('\n');
}

export function listSpecials() {
  return ['0. Nenhum', ...menu.specials.map(s => `${s.id}. ${s.name} — ${money(s.price)}`)].join('\n');
}

export function listAreas() {
  return deliveryAreas.map(a => `${a.id}. ${a.name} — ${money(a.fee)}`).join('\n');
}

export function calculateCart(cart) {
  const itemPrice = Number(cart.itemPrice || 0);
  const complements = cart.complements || [];
  const specials = cart.specials || [];
  const deliveryFee = cart.deliveryArea?.fee || 0;
  const additions = [...complements, ...specials].reduce((sum, item) => sum + Number(item.price), 0);
  const subtotal = itemPrice + additions;
  return { itemPrice, additions, subtotal, deliveryFee, total: subtotal + deliveryFee };
}

export function orderSummary(cart, includePayment = false) {
  const totals = calculateCart(cart);
  const lines = [];
  lines.push(`🧾 *Resumo do pedido*`);
  lines.push(`Produto: ${cart.productName}`);
  lines.push(`Tamanho: ${cart.sizeName}`);
  if (cart.fruit) lines.push(`Fruta: ${cart.fruit}`);
  if (cart.complements?.length) lines.push(`Complementos: ${cart.complements.map(c => c.name).join(', ')}`);
  if (cart.specials?.length) lines.push(`Adicionais especiais: ${cart.specials.map(c => c.name).join(', ')}`);
  lines.push(`Produto/base: ${money(totals.itemPrice)}`);
  if (totals.additions) lines.push(`Adicionais: ${money(totals.additions)}`);
  if (cart.deliveryArea) lines.push(`Entrega ${cart.deliveryArea.name}: ${money(totals.deliveryFee)}`);
  if (cart.address) lines.push(`Endereço: ${cart.address}`);
  lines.push(`*Total: ${money(totals.total)}*`);
  if (includePayment && cart.paymentMethod) lines.push(`Pagamento: ${cart.paymentMethod === 'pix' ? 'Pix' : 'Cartão'}`);
  return lines.join('\n');
}
