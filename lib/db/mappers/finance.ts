import { fkOrNull, money, moneyAbs, type Row } from './shared';

export function financeToRow(r: Row): Row {
  return {
    id: r.id,
    booking_id: fkOrNull(r.bkid ?? r.booking_id),
    cust_name: r.custName ?? r.cust_name,
    type: r.type,
    txn_date: r.date ?? r.txn_date ?? null,
    month: r.month,
    revenue: moneyAbs(r.rev ?? r.revenue),
    cost: moneyAbs(r.cost),
    cash_in: moneyAbs(r.cashIn ?? r.cash_in),
    cash_out: moneyAbs(r.cashOut ?? r.cash_out),
    status: r.status,
    invoice_ref: r.inv ?? r.invoice_ref ?? null,
    notes: r.notes ?? null,
  };
}

export function arToRow(r: Row): Row {
  return {
    id: r.id,
    finance_id: fkOrNull(r.finId ?? r.finance_id),
    cust_name: r.custName ?? r.cust_name,
    tour: r.tour,
    invoice_amount: moneyAbs(r.invoiceAmt ?? r.invoice_amount),
    deposit_paid: moneyAbs(r.depositPaid ?? r.deposit_paid),
    due_date: r.dueDate ?? r.due_date ?? null,
    status: r.status,
  };
}

export function apToRow(r: Row): Row {
  return {
    id: r.id,
    supplier: r.supplier,
    description: r.description,
    amount: moneyAbs(r.amount),
    due_date: r.dueDate ?? r.due_date ?? null,
    status: r.status,
    category: r.category ?? null,
  };
}

export function taxToRow(r: Row): Row {
  return {
    id: r.id,
    period: r.period,
    revenue: moneyAbs(r.rev ?? r.revenue),
    expenses: moneyAbs(r.expenses),
    vat_output: moneyAbs(r.vat_out ?? r.vat_output),
    vat_input: moneyAbs(r.vat_in ?? r.vat_input),
    corp_tax: moneyAbs(r.corp_tax),
  };
}

export function rowToFinance(r: Row): Row {
  return {
    id: r.id,
    bkid: r.booking_id ?? '',
    custName: r.cust_name,
    type: r.type,
    date: r.txn_date,
    month: r.month,
    rev: money(r.revenue),
    cost: money(r.cost),
    cashIn: money(r.cash_in),
    cashOut: money(r.cash_out),
    status: r.status,
    inv: r.invoice_ref,
    notes: r.notes,
  };
}

export function rowToAr(r: Row): Row {
  return {
    id: r.id,
    finId: r.finance_id,
    custName: r.cust_name,
    tour: r.tour,
    invoiceAmt: money(r.invoice_amount),
    depositPaid: money(r.deposit_paid),
    balance: r.balance,
    dueDate: r.due_date,
    status: r.status,
  };
}

export function rowToAp(r: Row): Row {
  return {
    id: r.id,
    supplier: r.supplier,
    description: r.description,
    amount: money(r.amount),
    dueDate: r.due_date,
    status: r.status,
    category: r.category,
  };
}

export function rowToTax(r: Row): Row {
  return {
    id: r.id,
    period: r.period,
    rev: money(r.revenue),
    expenses: money(r.expenses),
    vat_out: money(r.vat_output),
    vat_in: money(r.vat_input),
    corp_tax: money(r.corp_tax),
  };
}
