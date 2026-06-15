/* Auto-extracted from index.html — do not edit manually */

export const SEED_FINANCE = [
  {id:'FIN-2026-001',bkid:'BK-2026-001',custName:'James & Sarah Miller',   type:'Tour',   date:'2026-01-15',month:'Jan 2026',rev:12800,cost:8960, cashIn:3840, cashOut:8960,status:'Deposit Paid',inv:'INV-001',notes:''},
  {id:'FIN-2026-002',bkid:'BK-2026-002',custName:'Michael & Anna Chen',    type:'Tour',   date:'2026-02-08',month:'Feb 2026',rev:22000,cost:15400,cashIn:0,    cashOut:0,   status:'Confirmed',   inv:'INV-002',notes:''},
  {id:'FIN-2026-003',bkid:'BK-2026-003',custName:'Charlotte Dubois',       type:'Tour',   date:'2026-03-20',month:'Mar 2026',rev:3200, cost:2240, cashIn:3200, cashOut:2240,status:'Paid',        inv:'INV-003',notes:''},
  {id:'FIN-2026-004',bkid:'BK-2026-004',custName:'Oliver & Emma Watson',   type:'Tour',   date:'2026-03-22',month:'Mar 2026',rev:9600, cost:6720, cashIn:2880, cashOut:0,   status:'Deposit Paid',inv:'INV-004',notes:''},
  {id:'FIN-2026-005',bkid:'BK-2026-005',custName:'Yuki & Kenji Tanaka',    type:'Tour',   date:'2026-04-10',month:'Apr 2026',rev:18500,cost:12950,cashIn:18500,cashOut:12950,status:'Paid',        inv:'INV-005',notes:''},
  {id:'FIN-2026-006',bkid:'BK-2026-006',custName:'Al-Mansouri Family',     type:'Tour',   date:'2026-04-18',month:'Apr 2026',rev:31200,cost:21840,cashIn:9360, cashOut:0,   status:'Deposit Paid',inv:'INV-006',notes:''},
  {id:'FIN-2026-007',bkid:'BK-2026-007',custName:'Sophia & Marcus Klein',  type:'Tour',   date:'2026-05-05',month:'May 2026',rev:14400,cost:10080,cashIn:0,    cashOut:0,   status:'Invoiced',    inv:'INV-007',notes:''},
  {id:'FIN-2026-008',bkid:'',            custName:'',                        type:'Expense',date:'2026-01-31',month:'Jan 2026',rev:0,    cost:0,    cashIn:0,    cashOut:7500,status:'Paid',        inv:'',       notes:'January staff salaries'},
  {id:'FIN-2026-009',bkid:'',            custName:'',                        type:'Expense',date:'2026-02-28',month:'Feb 2026',rev:0,    cost:0,    cashIn:0,    cashOut:7500,status:'Paid',        inv:'',       notes:'February staff salaries'},
  {id:'FIN-2026-010',bkid:'',            custName:'',                        type:'Expense',date:'2026-03-31',month:'Mar 2026',rev:0,    cost:0,    cashIn:0,    cashOut:7500,status:'Paid',        inv:'',       notes:'March staff salaries'},
  {id:'FIN-2026-011',bkid:'',            custName:'',                        type:'Expense',date:'2026-04-30',month:'Apr 2026',rev:0,    cost:0,    cashIn:0,    cashOut:7500,status:'Paid',        inv:'',       notes:'April staff salaries'},
] as const;

export const SEED_AR = [
  {id:'AR-2026-001',finId:'FIN-2026-001',custName:'James & Sarah Miller',  tour:'North Vietnam 12D',    invoiceAmt:12800,depositPaid:3840,  balance:8960, dueDate:'2026-09-15',status:'Outstanding'},
  {id:'AR-2026-002',finId:'FIN-2026-002',custName:'Michael & Anna Chen',   tour:'Vietnam Full 14D',     invoiceAmt:22000,depositPaid:0,     balance:22000,dueDate:'2026-10-01',status:'Outstanding'},
  {id:'AR-2026-003',finId:'FIN-2026-004',custName:'Oliver & Emma Watson',  tour:'Central Vietnam 10D',  invoiceAmt:9600, depositPaid:2880,  balance:6720, dueDate:'2026-04-20',status:'Overdue'},
  {id:'AR-2026-004',finId:'FIN-2026-006',custName:'Al-Mansouri Family',    tour:'Vietnam Premium 16D',  invoiceAmt:31200,depositPaid:9360,  balance:21840,dueDate:'2026-09-01',status:'Outstanding'},
  {id:'AR-2026-005',finId:'FIN-2026-007',custName:'Sophia & Marcus Klein', tour:'South Vietnam 8D',     invoiceAmt:14400,depositPaid:0,     balance:14400,dueDate:'2026-05-10',status:'Overdue'},
  {id:'AR-2026-006',finId:'FIN-2026-003',custName:'Charlotte Dubois',      tour:'Central Vietnam 7D',   invoiceAmt:3200, depositPaid:3200,  balance:0,    dueDate:'2026-03-20',status:'Paid'},
  {id:'AR-2026-007',finId:'FIN-2026-005',custName:'Yuki & Kenji Tanaka',   tour:'North Vietnam 10D',    invoiceAmt:18500,depositPaid:18500, balance:0,    dueDate:'2026-04-10',status:'Paid'},
] as const;

export const SEED_AP = [
  {id:'AP-2026-001',supplier:'Bhaya Cruise Halong',         description:'Halong Bay cruise — Miller family Oct 2026',    amount:3200,dueDate:'2026-09-10',status:'Pending', category:'Accommodation'},
  {id:'AP-2026-002',supplier:'La Siesta Ma May Hanoi',       description:'Hotel block booking Oct 2026 — Miller',         amount:2800,dueDate:'2026-09-10',status:'Pending', category:'Accommodation'},
  {id:'AP-2026-003',supplier:'Hanoi Luxury Transfer',        description:'Airport + city transfers — Miller Oct 2026',     amount:480, dueDate:'2026-09-10',status:'Pending', category:'Transport'},
  {id:'AP-2026-004',supplier:'Central Vietnam Transport',    description:'Hue-Hoi An transfers — Watson family',          amount:360, dueDate:'2026-04-15',status:'Overdue', category:'Transport'},
  {id:'AP-2026-005',supplier:'Allegro Hoi An',               description:'Hotel 4 nights — Tanaka family Apr 2026',       amount:1890,dueDate:'2026-04-01',status:'Paid',    category:'Accommodation'},
  {id:'AP-2026-006',supplier:'Local Guide — Nguyen Van An',  description:'Guide fee 14D — Chen family Nov 2026',          amount:1200,dueDate:'2026-10-20',status:'Pending', category:'Guide'},
  {id:'AP-2026-007',supplier:'Medallion Hue',                description:'Hotel 3 nights — Al-Mansouri Sep 2026',         amount:4200,dueDate:'2026-08-25',status:'Pending', category:'Accommodation'},
  {id:'AP-2026-008',supplier:'Saigon Premium Cars',          description:'Transfers 5 days — Klein family Jun 2026',      amount:550, dueDate:'2026-05-20',status:'Overdue', category:'Transport'},
  {id:'AP-2026-009',supplier:'Ninh Binh Hidden Charm',       description:'Hotel 2 nights — Al-Mansouri Sep 2026',         amount:1600,dueDate:'2026-08-25',status:'Pending', category:'Accommodation'},
] as const;
