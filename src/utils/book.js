// Buy Now and Buy on Amazon are independently optional purchase options for a
// book. Existing books saved before this became two separate toggles only
// have the old single `cta` field ('Buy Now' | 'Buy on Amazon') — this infers
// sensible defaults from it so pre-existing listings keep working until the
// expert re-saves them from the editor (which writes the explicit fields).
export function getBookPurchaseFlags(book) {
  if (!book) return { buyNow: false, amazon: false };
  const buyNow = book.buyNowEnabled ?? (book.cta !== 'Buy on Amazon');
  const amazon = book.amazonEnabled ?? (book.cta === 'Buy on Amazon' && !!book.link);
  return { buyNow, amazon };
}
