/**
 * RentFlow authority / operating models — maps commercial arrangements to DB fields.
 * @see docs/RENTFLOW_AUTHORITY_STRUCTURE.md
 */

export type OperatingModel =
  | 'landlord_self_managed'
  | 'manager_operates_landlord_collects'
  | 'agency_collects_full_management'
  | 'agency_collects_pays_landlord'
  | 'agency_manages_fee_from_landlord';

export type PaymentDestination = 'manager' | 'landlord';

export interface OperatingModelMeta {
  id: OperatingModel;
  category: 1 | 2 | 3 | 4;
  title: string;
  shortLabel: string;
  description: string;
  whoOperates: string;
  whoCollects: string;
  whoGetsPaid: string;
  defaultPaymentDestination: PaymentDestination;
}

export const OPERATING_MODELS: OperatingModelMeta[] = [
  {
    id: 'landlord_self_managed',
    category: 1,
    title: 'Landlord-operated (owner is boss)',
    shortLabel: 'Landlord boss',
    description:
      'The property owner runs the portfolio, sets rules, and can build an in-house team. You may optionally delegate an external manager or agency.',
    whoOperates: 'Landlord (and their team)',
    whoCollects: 'Landlord or delegated manager (configurable)',
    whoGetsPaid: 'Landlord pays staff; external manager by separate agreement',
    defaultPaymentDestination: 'landlord',
  },
  {
    id: 'manager_operates_landlord_collects',
    category: 2,
    title: 'Manager operates — landlord collects',
    shortLabel: 'Landlord collects',
    description:
      'Agency/manager runs day-to-day ops (tenants, maintenance, invoices). Rent is collected on the landlord’s M-Pesa/bank; manager is paid by the landlord.',
    whoOperates: 'Manager / agency',
    whoCollects: 'Landlord',
    whoGetsPaid: 'Manager (management fee / invoice from landlord)',
    defaultPaymentDestination: 'landlord',
  },
  {
    id: 'agency_collects_full_management',
    category: 3,
    title: 'Agency collects & full management',
    shortLabel: 'Agency collects',
    description:
      'Manager/agency collects rent and fully manages the property. Supports multiple landlords and many properties under one agency account.',
    whoOperates: 'Manager / agency',
    whoCollects: 'Manager / agency',
    whoGetsPaid: 'Landlord via revenue share & payouts',
    defaultPaymentDestination: 'manager',
  },
  {
    id: 'agency_collects_pays_landlord',
    category: 4,
    title: 'Hybrid — agency collects, pays landlord',
    shortLabel: 'Collect → pay landlord',
    description:
      'Agency collects all rent, keeps commission/management fee, and remits the landlord’s share (revenue_share_pct).',
    whoOperates: 'Manager / agency',
    whoCollects: 'Manager / agency',
    whoGetsPaid: 'Landlord (net share after commission)',
    defaultPaymentDestination: 'manager',
  },
  {
    id: 'agency_manages_fee_from_landlord',
    category: 4,
    title: 'Hybrid — agency manages, landlord collects',
    shortLabel: 'Manage for fee',
    description:
      'Landlord collects rent. Agency enforces payments and operations; landlord pays a management fee (management_fee_pct).',
    whoOperates: 'Manager / agency',
    whoCollects: 'Landlord',
    whoGetsPaid: 'Manager (management fee %)',
    defaultPaymentDestination: 'landlord',
  },
];

export function getOperatingModelMeta(id: OperatingModel | string | null | undefined): OperatingModelMeta {
  return OPERATING_MODELS.find((m) => m.id === id) ?? OPERATING_MODELS[2];
}

export function paymentDestinationForModel(model: OperatingModel | string | null | undefined): PaymentDestination {
  const m = model as OperatingModel;
  if (m === 'manager_operates_landlord_collects' || m === 'agency_manages_fee_from_landlord') {
    return 'landlord';
  }
  if (m === 'landlord_self_managed') {
    return 'landlord';
  }
  return 'manager';
}

export function shouldSetLandlordAsPropertyOperator(model: OperatingModel): boolean {
  return model === 'landlord_self_managed';
}
