#!/usr/bin/env node
/**
 * prerender.js — turns the built SPA into real HTML for crawlers.
 *
 * Why this exists: plzgo is a Vue SPA, so the HTML Firebase serves is just
 * `<div id="app"></div>`. Google can execute JS, but it queues that work and
 * runs it late — a bad deal for a young domain with no authority. This script
 * runs after `vite build`: it serves dist/ locally, opens each public route in
 * headless Chrome, waits for Vue AND the Firestore fetches to finish, then
 * writes the rendered markup back to disk as a static file.
 *
 * Firebase Hosting serves a matching static file before it applies the SPA
 * rewrite, so /explore is served from dist/explore/index.html automatically.
 *
 * Run: node scripts/prerender.js   (wired into `npm run build`)
 */
import { createServer } from 'http'
import { readFile, writeFile, mkdir, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import { extname, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const PORT = 5199

// Public, content-bearing routes. Deliberately excluded:
//   /swipe     — needs store state from a previous screen, and robots.txt
//                disallows it anyway
//   /route/:id — user-generated itineraries, rendered from a Firestore doc
// Guide zones must match FOOD_ZONES in src/composables/useFoodGuide.js
const FOOD_ZONE_SLUGS = [
  'yaowarat', 'siam', 'sukhumvit', 'ari', 'old-city', 'silom', 'sathorn', 'riverside',
]

const ROUTES = [
  '/', '/explore', '/plan', '/privacy', '/terms',
  '/bangkok/food',
  ...FOOD_ZONE_SLUGS.map(s => `/bangkok/food/${s}`),
]

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
}

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0])
      let filePath = join(DIST, urlPath)
      if (!extname(filePath)) filePath = join(DIST, 'index.html') // SPA fallback
      try {
        const body = await readFile(filePath)
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' })
        res.end(body)
      } catch {
        res.writeHead(404).end('not found')
      }
    })
    server.listen(PORT, () => resolve(server))
  })
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('[prerender] dist/index.html missing — run `vite build` first.')
    process.exit(1)
  }

  // Keep a pristine shell. Firebase rewrites the dynamic routes (/swipe,
  // /route/:id) to this instead of the prerendered landing page, so those
  // screens don't flash someone else's content before Vue boots.
  await copyFile(join(DIST, 'index.html'), join(DIST, 'app.html'))

  const server = await startServer()
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  let ok = 0
  const rendered = []   // only routes that actually produced a file reach the sitemap

  // Each page load re-reads the whole food collection, and those reads are
  // occasionally slow enough to blow the wait budget. One retry turns a flaky
  // network into a non-event; without it a page silently drops out of the
  // sitemap for the rest of the day.
  const ATTEMPTS = 3
  for (const route of ROUTES) {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const done = await renderRoute(browser, route, attempt)
      if (done) { rendered.push(route); ok++; break }
      if (attempt < ATTEMPTS) console.log(`[prerender] retrying ${route}…`)
    }
  }

  async function renderRoute(browser, route, attempt) {
    const page = await browser.newPage()
    // A real desktop viewport — some content is width-gated
    await page.setViewport({ width: 1280, height: 1400 })
    try {
      // NOT networkidle0: the Firestore SDK holds a listening connection open
      // for the life of the page, so the network never goes idle and every
      // data-driven route times out. Wait for rendered content instead.
      await page.goto(`http://localhost:${PORT}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      })
      // Pages that load data expose data-prerender-ready and flip it to "true"
      // once the read resolves. Without that signal a slow query gets captured
      // mid-load — the page shell alone easily clears any text-length
      // heuristic, so the snapshot ships with an empty list.
      await page.waitForFunction(
        () => {
          const flag = document.querySelector('[data-prerender-ready]')
          if (flag) return flag.getAttribute('data-prerender-ready') === 'true'
          return (document.querySelector('#app')?.innerText || '').trim().length > 150
        },
        // Generous on purpose: every guide page re-reads ~200 docs, and that
        // request is regularly slow enough to blow a tighter budget. A page
        // that times out drops out of the sitemap for the whole deploy, so
        // waiting longer is much cheaper than losing it.
        { timeout: 90000 }
      )
      // Vue has mounted, but the Firestore reads and entrance animations have
      // not finished: the scramble tagline would be captured mid-scramble and
      // written to disk as literal gibberish, and counters would freeze
      // part-way. Give both time to land on their final values.
      await new Promise(r => setTimeout(r, 4500))

      const html = await page.evaluate(() => {
        // Scroll-reveal elements sit at opacity:0 until IntersectionObserver
        // adds .in — which never fires for anything below the fold in a
        // headless capture. Mark them all revealed so the saved HTML isn't
        // full of invisible text.
        document.querySelectorAll('.reveal, .hero-line').forEach(el => el.classList.add('in'))
        return '<!DOCTYPE html>' + document.documentElement.outerHTML
      })

      const text = await page.evaluate(() => document.body.innerText.trim().length)

      // Belt and braces. The ready flag is the primary guard, but a data page
      // that renders only its shell is ~1 kB of text where a real one is 6-20 kB.
      // Shipping that silently is worse than shipping nothing, because the
      // sitemap would then advertise an empty page as real content.
      if (route.startsWith('/bangkok/') && text < 2500) {
        throw new Error(`suspiciously thin (${text} chars) — treating as a failed load`)
      }

      const outPath = route === '/'
        ? join(DIST, 'index.html')
        : join(DIST, route.replace(/^\//, ''), 'index.html')
      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, html, 'utf8')

      const kb = (Buffer.byteLength(html) / 1024).toFixed(1)
      console.log(`[prerender] ${route.padEnd(10)} → ${kb} kB (${text} chars of text)`)
      return true
    } catch (e) {
      // A failed route must not ship a half-written file, and must not reach
      // the sitemap either — the SPA fallback still serves it correctly to
      // users, we just lose the SEO benefit for that page this build.
      const last = attempt >= ATTEMPTS
      console.error(`[prerender] ${last ? 'FAILED' : 'attempt ' + attempt + ' failed'} ${route}: ${e.message}`)
      return false
    } finally {
      await page.close()
    }
  }

  await browser.close()
  server.close()

  // Generate the sitemap from the routes we actually rendered. Maintaining it
  // by hand guarantees it drifts the first time a page is added or renamed,
  // and a sitemap listing URLs that 404 is worse than no sitemap.
  const PRIORITY = { '/': '1.0', '/bangkok/food': '0.9', '/explore': '0.9' }
  const CHANGEFREQ = { '/': 'weekly', '/explore': 'weekly' }
  const today = new Date().toISOString().slice(0, 10)
  const entries = rendered.map(r => [
    '  <url>',
    `    <loc>https://plzgo.me${r === '/' ? '/' : r}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${CHANGEFREQ[r] || (r.startsWith('/bangkok/') ? 'monthly' : 'yearly')}</changefreq>`,
    `    <priority>${PRIORITY[r] || (r.startsWith('/bangkok/') ? '0.8' : r === '/plan' ? '0.8' : '0.2')}</priority>`,
    '  </url>',
  ].join('\n')).join('\n')
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`
  await writeFile(join(DIST, 'sitemap.xml'), sitemap, 'utf8')
  console.log(`[prerender] sitemap.xml written with ${rendered.length} urls`)

  console.log(`[prerender] ${ok}/${ROUTES.length} routes prerendered`)
  if (ok === 0) process.exit(1)
}

main()
