import type { MetadataRoute } from 'next';

/*
 * The shop's pages are open to crawlers — in particular the icons Google shows
 * next to the order link (31.10.2026). Before this file every /robots.txt
 * answered with an HTML page, which crawlers read as "no rules".
 *
 * Except the pages that belong to one guest (1.11.2026): the checkout, the
 * order confirmation and the account screens. They carry `noindex` as well
 * (`buildStoreMetadata`); this keeps well-behaved crawlers from fetching them.
 * Both shapes are listed: `/<slug>/…` on our host, `/…` on a restaurant's domain.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/checkout', '/confirmation', '/account/', '/*/checkout', '/*/confirmation', '/*/account/'],
    },
  };
}
