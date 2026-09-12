/**
 * Copy and structural data for the product page (webvu.localhost / webvu.io).
 * SPEC.md § webvu.io — Product Page. Single source so Header and MobileNav
 * render the same nav, and tests can assert against it instead of literals.
 */

export const DASHBOARD_URL = 'http://dashboard.webvu.localhost';

export const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#pricing', label: 'Pricing' },
] as const;

export const FEATURES = [
  {
    title: 'Six pages',
    description: 'Home, About, Products or Services, Contact, and more — structured for a small business from the start.',
  },
  {
    title: 'Block-based builder',
    description: 'Drop in hero banners, galleries, forms, and pricing tables. Rearrange them without touching code.',
  },
  {
    title: 'Your own theme',
    description: 'Pick colours, fonts, and spacing that match your brand — applied across every page automatically.',
  },
  {
    title: 'A custom URL',
    description: 'Share yourbusiness.webvu.io — a clean, memorable address customers can find and trust.',
  },
  {
    title: 'A submission inbox',
    description: 'Contact and order forms land in one inbox, so enquiries never get lost in an email pile-up.',
  },
  {
    title: 'Visit analytics',
    description: 'See which pages get traffic, without cookies or third-party trackers on your site.',
  },
] as const;

export const STEPS = [
  {
    title: 'Sign up',
    description: 'Create your account and claim your web address in under a minute.',
  },
  {
    title: 'Build your pages',
    description: 'Add your products or services with the block builder — no design or coding experience needed.',
  },
  {
    title: 'Share your link',
    description: 'Publish and send customers straight to your new site.',
  },
] as const;
