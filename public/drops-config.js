
const logo = '/brand/logo.png';
const placeholder = { sample: true, sizes: ['S','M','L','XL'], colors: ['Black','Red'], gallery: [logo], product: '[ADD PRODUCT]', priceLabel: '[ADD PRICE]', priceCents: 4500, pointsAllowed: true };
export const dropConfig = {
  sample: true,
  reserveMinutes: 10,
  perAccount: 1,
  maximumPending: 12,
  pointCents: 1,
  pointCapPercent: 20,
  rewardPoints: 40,
  earlyHours: 24,
  creatorDiscount: 5,
  previewCreatorCode: 'FAZEDEMO',
  previewEpoch: '2026-11-15T00:00:00Z',
  drops: [
    { ...placeholder, id: 'throwback-preview', name: 'Throwback Collection', story: 'A sample brief for a numbered release inspired by FaZe’s montage era.', quantity: 500, sampleSold: 0, launch: '2026-12-20T19:00:00Z', gate: 'og-early' },
    { ...placeholder, id: 'red-on-black-preview', name: 'Red on Black', story: 'An original FaZe color study for the sample collector checkout.', quantity: 120, sampleSold: 14, launch: '2026-01-01T19:00:00Z', gate: 'public' },
    { ...placeholder, id: 'archive-preview', name: 'Archive Edition', story: 'A sample sold-out edition with a restock alert.', quantity: 60, sampleSold: 60, launch: '2026-01-01T19:00:00Z', gate: 'level', level: 10 }
  ]
};
