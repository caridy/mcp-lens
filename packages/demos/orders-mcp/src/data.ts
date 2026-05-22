/**
 * Fake order data. State lives in a module-level Map so actions (cancel,
 * update) appear to persist within the process lifetime. In a real server
 * this would be a database call.
 */

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderLineItem {
  sku: string;
  name: string;
  quantity: number;
  unitPriceUsd: number;
}

export interface Order {
  id: string;
  placedAt: string;
  status: OrderStatus;
  customerId: string;
  items: OrderLineItem[];
  totalUsd: number;
  shippingAddress: string;
  trackingNumber?: string;
}

const seed: Order[] = [
  {
    id: 'A-1042',
    placedAt: '2026-04-28T14:11:00Z',
    status: 'processing',
    customerId: 'cust-77',
    items: [
      {
        sku: 'asics-gel-resolution',
        name: 'Asics Gel-Resolution 9',
        quantity: 1,
        unitPriceUsd: 150,
      },
      {
        sku: 'wilson-overgrip-pack',
        name: 'Wilson Pro Overgrip (3 pack)',
        quantity: 2,
        unitPriceUsd: 12.5,
      },
    ],
    totalUsd: 175,
    shippingAddress: '123 Baseline Ave, Austin, TX',
  },
  {
    id: 'A-1043',
    placedAt: '2026-04-25T09:34:00Z',
    status: 'shipped',
    customerId: 'cust-77',
    items: [
      {
        sku: 'nike-vapor-cage',
        name: 'Nike Vapor Cage 5',
        quantity: 1,
        unitPriceUsd: 150,
      },
    ],
    totalUsd: 150,
    shippingAddress: '123 Baseline Ave, Austin, TX',
    trackingNumber: '1Z999AA10123456784',
  },
  {
    id: 'A-1039',
    placedAt: '2026-04-10T18:02:00Z',
    status: 'delivered',
    customerId: 'cust-77',
    items: [
      {
        sku: 'babolat-string-set',
        name: 'Babolat RPM Blast String (set)',
        quantity: 3,
        unitPriceUsd: 18,
      },
    ],
    totalUsd: 54,
    shippingAddress: '123 Baseline Ave, Austin, TX',
    trackingNumber: '1Z999AA10123123123',
  },
  {
    id: 'A-1051',
    placedAt: '2026-05-02T11:18:00Z',
    status: 'pending',
    customerId: 'cust-77',
    items: [
      {
        sku: 'wilson-clash-100',
        name: 'Wilson Clash 100 v3 racquet',
        quantity: 1,
        unitPriceUsd: 249,
      },
      {
        sku: 'wilson-shoe-bag',
        name: 'Wilson Tour Shoe Bag',
        quantity: 1,
        unitPriceUsd: 35,
      },
    ],
    totalUsd: 284,
    shippingAddress: '123 Baseline Ave, Austin, TX',
  },
  {
    id: 'A-1048',
    placedAt: '2026-04-30T08:47:00Z',
    status: 'processing',
    customerId: 'cust-77',
    items: [
      {
        sku: 'head-radical-mp',
        name: 'Head Radical MP racquet',
        quantity: 1,
        unitPriceUsd: 220,
      },
    ],
    totalUsd: 220,
    shippingAddress: '456 Crosscourt Ln, Austin, TX',
  },
];

const store = new Map<string, Order>(seed.map((o) => [o.id, { ...o }]));

export function listOrders(
  filter: { status?: OrderStatus; customerId?: string } = {},
): Order[] {
  return Array.from(store.values()).filter((o) => {
    if (filter.status && o.status !== filter.status) return false;
    if (filter.customerId && o.customerId !== filter.customerId) return false;
    return true;
  });
}

export function getOrder(id: string): Order | null {
  return store.get(id) ? { ...store.get(id)! } : null;
}

export function cancelOrder(id: string): { ok: true; order: Order } | { ok: false; reason: string } {
  const o = store.get(id);
  if (!o) return { ok: false, reason: `No order with id "${id}".` };
  if (o.status === 'cancelled')
    return { ok: false, reason: 'Order is already cancelled.' };
  if (o.status === 'delivered')
    return { ok: false, reason: 'Delivered orders cannot be cancelled.' };
  o.status = 'cancelled';
  return { ok: true, order: { ...o } };
}

export function updateShippingAddress(
  id: string,
  address: string,
): { ok: true; order: Order } | { ok: false; reason: string } {
  const o = store.get(id);
  if (!o) return { ok: false, reason: `No order with id "${id}".` };
  if (o.status !== 'pending' && o.status !== 'processing')
    return {
      ok: false,
      reason: `Cannot change address of an order in status "${o.status}".`,
    };
  o.shippingAddress = address;
  return { ok: true, order: { ...o } };
}
