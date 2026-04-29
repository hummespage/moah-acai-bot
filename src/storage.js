import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('runtime');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

export function ensureRuntime() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]');
}

export function readOrders() {
  ensureRuntime();
  return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
}

export function saveOrder(order) {
  const orders = readOrders();
  const index = orders.findIndex((o) => o.id === order.id);
  if (index >= 0) orders[index] = order;
  else orders.push(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  return order;
}

export function findOrder(id) {
  return readOrders().find((o) => o.id === id);
}
