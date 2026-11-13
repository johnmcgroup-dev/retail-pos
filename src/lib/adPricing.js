// Paid placement options tenants can buy for their products.
export const AD_PLACEMENTS = {
  storefront_featured: {
    label: "Storefront feature",
    blurb: "Your product leads the featured strip on your shop page.",
    perDay: 1500,
  },
  pos_spotlight: {
    label: "POS spotlight",
    blurb: "Highlighted at the top of the cashier's product grid.",
    perDay: 1000,
  },
  home_banner: {
    label: "Homepage banner",
    blurb: "A banner slot on the My Retailer Pro home screen.",
    perDay: 2000,
  },
};

export const AD_DURATIONS = [7, 14, 30];

export function adPrice(placement, days) {
  const rate = AD_PLACEMENTS[placement]?.perDay || 0;
  return rate * (Number(days) || 0);
}

export function placementLabel(placement) {
  return AD_PLACEMENTS[placement]?.label || placement;
}