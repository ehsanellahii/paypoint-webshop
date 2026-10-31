import type { MetadataRoute } from 'next';

/*
 * Nothing on the shop is hidden from crawlers — in particular not the icons
 * Google shows next to the order link (31.10.2026). Before this file every
 * /robots.txt answered with an HTML page, which crawlers read as "no rules".
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/' } };
}
