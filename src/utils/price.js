// Formats a stored offer price (e.g. "25000", "$25000", "199/mo", "Contact for
// pricing") into the standard "$25,000" web format — thousands separators on
// the integer part, decimals and any trailing suffix (like "/mo") preserved
// exactly, and non-numeric values (e.g. "Contact for pricing") passed through
// unchanged.
export function formatOfferPrice(price) {
  if (price === null || price === undefined || price === '') return '';
  const str = String(price).trim();
  const match = str.match(/^\$?(\d[\d,]*)(\.\d+)?(.*)$/);
  if (!match) return str;
  const [, intPart, decPart = '', suffix = ''] = match;
  const withCommas = intPart.replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${withCommas}${decPart}${suffix}`;
}
