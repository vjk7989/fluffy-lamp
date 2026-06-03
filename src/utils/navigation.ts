// An array of links for navigation bar
const navBarLinks = [
  { name: 'Home', url: '/' },
  { name: 'Products', url: '/products/' },
  { name: 'Services', url: '/services/' },
  { name: 'Blog', url: '/blog/' },
  // { name: 'Contact', url: '/contact/' },
];
// An array of links for footer
const footerLinks = [
  {
    section: 'Ecosystem',
    links: [
      { name: 'Inference', url: '/blog/post-1/' },
      { name: 'Harness', url: '/blog/post-2/' },
      { name: 'Security', url: '/blog/post-5/' },
    ],
  },
  {
    section: 'Company',
    links: [
      { name: 'Home', url: '/' },
      { name: 'Products', url: '/products/' },
      { name: 'Services', url: '/services/' },
      { name: 'Blog', url: '/blog/' },
      { name: 'Contact', url: '/contact/' },
    ],
  },
];
// An object of links for social icons
const socialLinks = {
  instagram: 'https://www.instagram.com/pavii.ai/',
  linkedIn: 'https://www.linkedin.com/company/112466974/admin/dashboard/',
  github: 'https://github.com/buckleson',
  medium: 'https://medium.com/@pavii.ai',
  substack: 'https://substack.com/@paviiai',
  x: 'https://x.com',
};

export default {
  navBarLinks,
  footerLinks,
  socialLinks,
};
