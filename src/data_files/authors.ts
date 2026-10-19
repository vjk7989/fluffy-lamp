/**
 * Article authors. Every article lists these three unless its front matter
 * sets `authors`. Research papers and white papers are different: they carry
 * the company names and Vijay Tadepalli only.
 */
export interface Author {
  id: AuthorId;
  name: string;
  role?: string;
  /** Public file path, or none for an initials avatar. */
  image?: string;
  url?: string;
}
export type AuthorId = 'vijay-tadepalli' | 'vengal-thummala' | 'arjun-srivatsav';

export const AUTHORS: Record<AuthorId, Author> = {
  'vijay-tadepalli': { id: 'vijay-tadepalli', name: 'Vijay Tadepalli', role: 'Founder', image: '/team/vijay.jpg', url: 'https://www.linkedin.com/in/vijay-tadepalli-279746226/' },
  'vengal-thummala': { id: 'vengal-thummala', name: 'Vengal Thummala' },
  'arjun-srivatsav': { id: 'arjun-srivatsav', name: 'Arjun Srivatsav', role: 'AI Developer Advocate' },
};
export const AUTHOR_IDS = Object.keys(AUTHORS) as [AuthorId, ...AuthorId[]];
export const DEFAULT_AUTHORS: AuthorId[] = ['vijay-tadepalli', 'vengal-thummala', 'arjun-srivatsav'];

export const authorsOf = (ids?: AuthorId[]) => (ids?.length ? ids : DEFAULT_AUTHORS).map(id => AUTHORS[id]);
export const authorNames = (list: Author[]) =>
  list.length < 2 ? (list[0]?.name ?? '') : `${list.slice(0, -1).map(a => a.name).join(', ')} and ${list.at(-1)!.name}`;
export const initials = (name: string) => name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
