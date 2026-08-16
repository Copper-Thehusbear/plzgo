/**
 * Per-page SEO head: title, meta description, canonical, and JSON-LD.
 *
 * The router sets title/description for the static routes, but the guide
 * pages are data-driven and need to set theirs after the data lands. The
 * prerender pass snapshots the DOM once everything has settled, so whatever
 * these helpers write to <head> ends up in the static HTML.
 *
 * Every tag written here is tagged data-seo so it can be cleaned up on
 * unmount — otherwise navigating between guide pages in the SPA would stack
 * duplicate canonicals and JSON-LD blocks, which is worse than having none.
 */
const SITE = 'https://plzgo.me'

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    el.setAttribute('data-seo', '')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function setSeoHead({ title, description, path, jsonLd }) {
  if (title) document.title = title
  if (description) {
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:description', description)
  }
  if (title) upsertMeta('property', 'og:title', title)

  if (path) {
    const url = `${SITE}${path}`
    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', url)
    upsertMeta('property', 'og:url', url)
  }

  if (jsonLd) {
    // Replace rather than append — a second visit must not leave two graphs
    document.head.querySelectorAll('script[data-seo-jsonld]').forEach(n => n.remove())
    const s = document.createElement('script')
    s.type = 'application/ld+json'
    s.setAttribute('data-seo-jsonld', '')
    s.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(s)
  }
}

export function clearSeoHead() {
  document.head.querySelectorAll('script[data-seo-jsonld]').forEach(n => n.remove())
}

/** Breadcrumbs help Google show the guide hierarchy in results. */
export function breadcrumbLd(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: `${SITE}${t.path}`,
    })),
  }
}

/** A restaurant list, in the shape Google understands for "best X in Y" pages. */
export function restaurantListLd({ name, description, path, places }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    url: `${SITE}${path}`,
    numberOfItems: places.length,
    itemListElement: places.map((p, i) => {
      const lat = p.location?.latitude ?? p.latitude
      const lng = p.location?.longitude ?? p.longitude
      const item = {
        '@type': 'Restaurant',
        name: p.name_en || p.name,
        servesCuisine: 'Thai',
        address: {
          '@type': 'PostalAddress',
          addressLocality: p.zone_en || p.zone || 'Bangkok',
          addressRegion: 'Bangkok',
          addressCountry: 'TH',
        },
      }
      if (p.price_range) item.priceRange = p.price_range
      if (p.opening_hours_en || p.opening_hours) item.openingHours = p.opening_hours_en || p.opening_hours
      if (lat != null && lng != null) {
        item.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng }
      }
      return { '@type': 'ListItem', position: i + 1, item }
    }),
  }
}
