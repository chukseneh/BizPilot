// Made-up figures for Sample mode ONLY. Nothing here came from the real system,
// and every value rendered from this file carries a SAMPLE label on screen.
// Plan content (stories, requirements, releases) is never faked here — it always
// comes from .colaberry/plan.json, in both modes.

// Loaded as a classic script (not a module) so index.html also works when opened from disk.
window.CC_SAMPLE = {
  currency: '₦',

  // What the REQ-003 dashboard figures might look like on a typical day.
  snapshot: {
    sales_today: 184500,
    expenses_today: 62300,
    estimated_profit_today: 41750,
    customer_debts_outstanding: 96000,
    low_stock_products: 3,
  },

  lowStock: [
    { product: 'Peak Milk 400g', quantity: 3, reorder_level: 10 },
    { product: 'Golden Penny Semovita 1kg', quantity: 2, reorder_level: 8 },
    { product: 'Indomie Chicken (carton)', quantity: 1, reorder_level: 5 },
  ],

  debtors: [
    { customer: 'Mama Ngozi Provisions', owed: 42000, days_overdue: 12 },
    { customer: 'Tunde (Balogun Market)', owed: 31500, days_overdue: 5 },
    { customer: 'Aisha Beauty Store', owed: 22500, days_overdue: 2 },
  ],

  // Example outcome measures (the real plan has none yet).
  measures: [
    {
      id: 'sample-record-time',
      name: 'Time to record a sale by text',
      target: 'under 10 seconds',
      value: '7.4 seconds',
      history: [
        { day: 'Mon', value: '9.8 s' },
        { day: 'Tue', value: '8.6 s' },
        { day: 'Wed', value: '7.4 s' },
      ],
    },
    {
      id: 'sample-debt-recovered',
      name: 'Overdue debt recovered within 30 days',
      target: '60%',
      value: '48%',
      history: [
        { day: 'Week 1', value: '31%' },
        { day: 'Week 2', value: '42%' },
        { day: 'Week 3', value: '48%' },
      ],
    },
  ],

  // An example scoped agent with run history (the real plan has no agents yet).
  agent: {
    name: 'Debt Reminder Agent',
    purpose: 'Finds overdue customer debts and drafts WhatsApp reminders for the owner to approve.',
    trigger: 'Every morning at 08:00',
    autonomy_level: 'drafts, human approves',
    approval_gate: 'Owner approves each reminder before it is sent',
    runs: [
      { when: 'Today 08:00', result: '3 reminders drafted, 2 approved and sent' },
      { when: 'Yesterday 08:00', result: '1 reminder drafted, approved and sent' },
      { when: '2 days ago 08:00', result: 'No overdue debts over the threshold' },
    ],
  },

  // Applied in order to plan.derived.systems, cycling if there are more systems.
  systemStatuses: ['connected', 'not_connected', 'error'],
  systemCheckedMinutesAgo: [2, 2, 14],
};
