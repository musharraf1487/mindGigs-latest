// Turns a title into a URL-safe slug, e.g. "The Founder's Playbook" -> "the-founders-playbook".
// Used to build shareable book detail page URLs: mindgigs.com/{handle}/{slug}.
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
