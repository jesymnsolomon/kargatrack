// Pictures in /public/items/thumbs (256×256 WebP, ~5 KB each).
const P = (f) => `/items/thumbs/${f}.webp`;

export const ITEM_IMAGES = [
  { group: 'Ice Cream', list: [
    ['choco-crunch-popsicle', 'Chocolate crunch pop'],
    ['swirl-popsicle', 'Colorful swirl pop'],
    ['white-popsicle', 'White ice pop'],
    ['watermelon-popsicle', 'Watermelon pop'],
    ['blueberry-popsicle', 'Blueberry pop'],
    ['choco-chip-cone', 'Chocolate cone'],
    ['choco-vanilla-cone', 'Choco vanilla cone'],
    ['vanilla-swirl-cone', 'Vanilla swirl cone'],
    ['strawberry-cone', 'Strawberry cone'],
    ['strawberry-choco-cone', 'Strawberry choco cone'],
    ['cherry-sundae-cone', 'Cherry sundae cone'],
    ['choco-nut-cone', 'Choco nut cone'],
    ['choco-berry-cone', 'Choco berry cone'],
    ['party-cone', 'Party cone'],
    ['triple-scoop-cone', 'Triple scoop'],
    ['mint-mix-cone', 'Mint mix cone'],
    ['vanilla-cup', 'Vanilla cup'],
    ['berry-mint-cup', 'Berry mint cup'],
    ['fruit-basket', 'Fruit basket'],
  ] },
  { group: 'Balot', list: [['egg', 'Egg'], ['chicharon', 'Chicharon']] },
  { group: 'Puto', list: [['puto-white', 'White puto'], ['maja-purple', 'Maja (purple)']] },
].map((g) => ({ ...g, list: g.list.map(([f, label]) => ({ src: P(f), label })) }));

/** Default picture by item name, so older items get one without editing. */
const BY_NAME = {
  'pinipig': P('choco-crunch-popsicle'),
  'ice cream': P('swirl-popsicle'),
  'ice cream cone': P('choco-chip-cone'),
  'buko salad': P('white-popsicle'),
  'balot': P('egg'),
  'penoy': P('egg'),
  'chicharon': P('chicharon'),
  'puto': P('puto-white'),
  'white puto': P('puto-white'),
  'maja': P('maja-purple'),
  'maha': P('maja-purple'),
};

/** item.image wins; '' means "no picture" was chosen on purpose. */
export function itemImage(item) {
  if (!item) return null;
  if (item.image !== undefined && item.image !== null) return item.image || null;
  return BY_NAME[(item.name || '').trim().toLowerCase()] ?? null;
}
