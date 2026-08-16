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
const ROUTES = ['/', '/explore', '/plan', '/privacy', '/terms']

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
  for (const route of ROUTES) {
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
      await page.waitForFunction(
        () => (document.querySelector('#app')?.innerText || '').trim().length > 150,
        { timeout: 30000 }
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

      const outPath = route === '/'
        ? join(DIST, 'index.html')
        : join(DIST, route.replace(/^\//, ''), 'index.html')
      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, html, 'utf8')

      const kb = (Buffer.byteLength(html) / 1024).toFixed(1)
      const text = await page.evaluate(() => document.body.innerText.trim().length)
      console.log(`[prerender] ${route.padEnd(10)} → ${kb} kB (${text} chars of text)`)
      ok++
    } catch (e) {
      // A failed route must not ship a half-written file; the SPA fallback
      // still serves that route correctly, we just lose the SEO benefit.
      console.error(`[prerender] FAILED ${route}: ${e.message}`)
    } finally {
      await page.close()
    }
  }

  await browser.close()
  server.close()

  console.log(`[prerender] ${ok}/${ROUTES.length} routes prerendered`)
  if (ok === 0) process.exit(1)
}

main()
