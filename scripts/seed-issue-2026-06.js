#!/usr/bin/env node
/**
 * Seeds Firestore `issues/2026-06` — June 2026 Plzgo Explore issue.
 *
 * 5-Dimension Ad Infrastructure:
 *   D1 header_banner   — Powered-by ribbon under hero (Ambient Brand slot)
 *   D2 top_list        — 10-item editorial list; ranks 02/05/08 are Native Ads
 *   D3 hospitality     — 3-col grid: Luxury · Hostel · Pride (each with Agoda affiliate URL)
 *   D4 events          — featured + side cards with ticket/RSVP CTAs
 *   D5 neighborhood    — quick-list of 4; slot 04 is Neighborhood Sponsor
 *
 * Data sources (researched May 2026):
 *   - Bangkok Pride Festival 2026 → ThaiPR / The Beat / Nation Thailand
 *   - Bangkok Love Parade Jun 28 → misterb&b / Bangkok Pride
 *   - Bangkok World Music Day Jun 13 → Nation Thailand
 *   - Kid Laroi @ Samyan Mitrtown Jun 26 → SongKick
 *   - Bar Us / ALIEN / Opium / BeneBene / G.O.D / Cielo → TimeOut / BK Mag / 50Best
 *
 * IG handles below are VERIFIED via search hits to instagram.com profile pages.
 * Where a venue's official IG could not be confirmed (e.g. Cielo Sky Bar, JJ Green
 * — community spaces not single accounts), the ig field is null so the template
 * hides the link rather than rendering a broken handle.
 *
 * Hotel affiliate links use Agoda partnersearch with our CID (1964186) baked in —
 * every outbound click is tracked and commissionable. Pattern:
 *   https://www.agoda.com/partners/partnersearch.aspx?cid=1964186&textToSearch=<NAME>&dest_id=17297
 * (17297 = Agoda's destination ID for Bangkok)
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('./plzgo-db-task/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const AGODA_CID = '1964186'
const BANGKOK_DEST_ID = '17297'

// Build a tracked Agoda search URL for any hotel name. Survives if Agoda's slug-URLs
// change because we redirect through partnersearch.aspx, not a specific hotel page.
function agodaSearch(hotelName) {
  const q = encodeURIComponent(`${hotelName} Bangkok`)
  return `https://www.agoda.com/partners/partnersearch.aspx?cid=${AGODA_CID}&textToSearch=${q}&dest_id=${BANGKOK_DEST_ID}`
}

// Venue photography is sourced from official channels only — NO generic stock photos.
// (Cycling Unsplash IDs across venues = a visual lie; each slot is a different real place.)
// Until a verified photo exists for a venue, its slot stays null and the Explore UI renders
// a styled placeholder. The keys below double as a checklist of the photo type each slot needs.
const IMG = {
  yaowarat: null, seafood: null, bar: null, rooftop: null, market: null,
  industrial: null, cocktail: null, club: null, cafe: null,
}

// Verified, venue-specific Agoda CDN photos (photo1) pulled from our `hotels` collection.
// These are the only two Explore venues we currently have a real, official image for.
const HOTEL_IMG = {
  standardMahanakhon: 'https://pix4.agoda.net/hotelimages/29858837/-1/34fac5a0d8819ff651a2466e5294ba1f.jpg?s=600x400&ca=29&ce=0',
  ibisStylesSilom:    'https://pix5.agoda.net/hotelimages/14654969/-1/8e1a6388c644b0ecd3dc21776c3c900b.jpg?s=600x400&ca=13&ce=1',
}

const issue = {
  issue_id:       '2026-06',
  issue_label:    'Issue 06 · June 2026',
  editorial_vibe: 'Pride Capital',

  hero: {
    title_top:    'Bangkok',
    title_italic: 'Patches The World',
    intro:        'June is when the city stops pretending. A 500-meter rainbow flag, a 3.8km parade through Silom, free music until dawn — this is how Bangkok shows the world how Pride is done.',
  },

  // D1 — Anchor Header Banner. sponsor_brand=null = HOT slot available.
  header_banner: {
    is_active:     true,
    ad_label:      'POWERED BY',
    sponsor_brand: null,
    placeholder:   '[ HOT — Issue Sponsor Slot ]',
    sponsor_ig:    null,
    sponsor_url:   null,
    tagline:       'Sponsored Issue · June 2026',
  },

  spotlight: {
    eyebrow:      'The Spotlight',
    title:        'Silom',
    title_italic: 'Reimagined',
    img:          IMG.yaowarat,
    img_caption:  'Pride Parade · Silom Road',
    copy:         'From May 28 to June 1, Silom becomes the brightest avenue on earth. The 3.8km Bangkok Pride Parade caps it off — and the bars stay open until everyone has finally gone home.',
    cta_text:     'Add Pride to my route',
  },

  // D2 — Top 10. Ranks 02 / 05 / 08 are Native Ads.
  top_list: [
    { rank: '01', name: 'Bar Us',        zone: 'Sukhumvit 26', img: IMG.cocktail,
      desc: "Asia's #4 best bar — immersive cocktail tasting menu in a pitch-black 'drinking lab.' Currently the benchmark for modern Asian mixology.",
      tag: 'Hottest', is_sponsored: false },

    { rank: '02', name: 'ALIEN Bangkok', zone: 'Sukhumvit 16', img: IMG.club,
      desc: "Western dining in an unmistakably otherworldly setting — cosmic murals, immersive details, and bites that justify the gimmick.",
      tag: 'Hot',     is_sponsored: true,
      ad_label: 'Partner Pick',
      partner_ig: '@alien_bangkok',
      partner_url: 'https://www.instagram.com/alien_bangkok/' },

    { rank: '03', name: 'Opium',         zone: 'Yaowarat',     img: IMG.yaowarat,
      desc: "Top floors of POTONG. 'Liquid Surreality' cocktails inside a 120-year-old Chinatown shophouse. Asia's 50 Best #43.",
      tag: 'Classic', is_sponsored: false },

    { rank: '04', name: 'BeneBene',      zone: 'Sukhumvit 49', img: IMG.seafood,
      desc: "Thai-Talian hidden above Yard49. Chef Jah (MasterChef Thailand) pairs local seafood with Italian comfort. Book ahead — it's full.",
      tag: 'New',     is_sponsored: false },

    { rank: '05', name: 'G.O.D Bangkok', zone: 'Soi Nana',     img: IMG.bar,
      desc: "Genius On Drugs. Asia's 50 Best #26. Spirit-forward cocktails + uni pairings, in two fused shophouses with stained-glass walls.",
      tag: 'Hot',     is_sponsored: true,
      ad_label: 'Partner Pick',
      partner_ig: '@god_bkk',
      partner_url: 'https://www.instagram.com/god_bkk/' },

    { rank: '06', name: 'Cielo Sky Bar', zone: 'Phra Khanong', img: IMG.rooftop,
      desc: "46F of Skywalk Condo, glass-floor section, 360 views over Sukhumvit. 1960s Art Deco rooftop. Get the sunset slot.",
      tag: 'Rooftop', is_sponsored: false },

    { rank: '07', name: 'T&K Seafood',   zone: 'Yaowarat',     img: IMG.seafood,
      desc: "The green-shirts. Plastic chairs on Yaowarat Road. Tiger prawns the size of your forearm. The definitive Chinatown seafood night.",
      tag: 'Classic', is_sponsored: false },

    { rank: '08', name: 'Soi Nana',      zone: 'Yaowarat',     img: IMG.industrial,
      desc: "From quiet street to global drinking destination in five years. Hop the bars — they all know each other and they all want you to stay.",
      tag: 'Hot',     is_sponsored: true,
      ad_label: 'Partner Pick',
      // Soi Nana is a bar street, not a single account — no official IG to link.
      // (Was @soinananbkk → an IG *location* page; handle/url didn't match. Nulled per policy.)
      partner_ig: null,
      partner_url: null },

    { rank: '09', name: 'Tichuca',       zone: 'Phra Khanong', img: IMG.rooftop,
      desc: "That LED tree on the 46F of T-One Building is still the queen of the skyline. Reserve or wait forever.",
      tag: 'Classic', is_sponsored: false },

    { rank: '10', name: 'JJ Green',      zone: 'Chatuchak',    img: IMG.market,
      desc: "The 'cool' cousin of Chatuchak Market. Vintage finds, actually good street food, fewer tourists per square meter.",
      tag: 'Local Gem', is_sponsored: false },
  ],

  // D3 — Hospitality Showcase
  hospitality: {
    section_title:  'Where to Sleep This',
    section_italic: 'Month',
    section_copy:   'Three lanes, picked for the way you actually travel.',
    columns: [
      {
        key: 'luxury',
        accent_letter: 'L',
        category_label: 'Luxury & Design Stay',
        category_copy:  '5-star, edgy design. June flash deals.',
        hotels: [
          { name: '[ HOT — Premium Hotel Slot ]',
            zone: 'Sukhumvit',  img: IMG.rooftop,
            deal: 'Up to 25% off June nights',
            ig:   null, ig_url: null,
            agoda_url: null,
            is_sponsored: true, ad_label: 'Featured Deal' },
          { name: 'Capella Bangkok',
            zone: 'Riverside',  img: IMG.rooftop,
            deal: 'Riverfront villas + Michelin-star dining.',
            ig:   '@capellabangkok',
            ig_url: 'https://www.instagram.com/capellabangkok/',
            agoda_url: agodaSearch('Capella Bangkok'),
            is_sponsored: false },
          { name: 'The Standard Bangkok Mahanakhon',
            zone: 'Silom',      img: HOTEL_IMG.standardMahanakhon,
            deal: 'Jaime Hayon interiors · rooftop bar at 78F.',
            ig:   '@thestandardbangkok',
            ig_url: 'https://www.instagram.com/thestandardbangkok/',
            agoda_url: agodaSearch('The Standard Bangkok Mahanakhon'),
            is_sponsored: false },
        ],
      },
      {
        key: 'hostel',
        accent_letter: 'H',
        category_label: 'Elite Hostel & Design Beds',
        category_copy:  'Award-winning hostels for craftspeople & digital nomads.',
        hotels: [
          { name: 'Once Again Hostel',
            zone: 'Phra Nakhon', img: IMG.cafe,
            deal: 'Heritage shophouse · free walking tour + Thai class.',
            ig:   '@onceagainhostel',
            ig_url: 'https://www.instagram.com/onceagainhostel/',
            agoda_url: agodaSearch('Once Again Hostel'),
            is_sponsored: false },
          { name: 'Lub d Bangkok Silom',
            zone: 'Silom',       img: IMG.industrial,
            deal: 'Walk to Patpong + BTS Sala Daeng. Co-working downstairs.',
            ig:   '@lubdexperience',
            ig_url: 'https://www.instagram.com/lubdexperience/',
            agoda_url: agodaSearch('Lub d Bangkok Silom'),
            is_sponsored: false },
          { name: '[ HOT — Hostel Slot ]',
            zone: 'Ari',         img: IMG.cafe,
            deal: 'New opening · ask about Pride rates',
            ig:   null, ig_url: null,
            agoda_url: null,
            is_sponsored: true, ad_label: 'New Partner' },
        ],
      },
      {
        key: 'pride',
        accent_letter: 'P',
        category_label: 'Pride & Queer Peak',
        category_copy:  'Silom-Sathon stays. Pool parties. Pride events on-site.',
        hotels: [
          { name: 'Pula Silom',
            zone: 'Silom',       img: IMG.club,
            deal: 'misterb&b top-3 most-booked gay hotel · Pride packages live.',
            ig:   null,
            ig_url: null,
            agoda_url: agodaSearch('D Varee Xpress Pula Silom'),
            is_sponsored: false },
          { name: 'ibis Styles Bangkok Silom',
            zone: 'Silom',       img: HOTEL_IMG.ibisStylesSilom,
            deal: 'Walk to Silom Soi 2 & 4. Official Pride accommodation.',
            ig:   null, ig_url: null,
            agoda_url: agodaSearch('ibis Styles Bangkok Silom'),
            is_sponsored: false },
          { name: '[ HOT — Pride Hotel Slot ]',
            zone: 'Sathon',      img: IMG.cocktail,
            deal: 'June pool-party package available',
            ig:   null, ig_url: null,
            agoda_url: null,
            is_sponsored: true, ad_label: 'Pride Partner' },
        ],
      },
    ],
  },

  // D4 — Event Ticket Conversion Gate
  events: {
    section_title:  'June',
    section_italic: 'On Sale',
    section_copy:   'Reserve before it sells out.',
    featured: {
      name:           'Bangkok Pride Parade 2026',
      date_label:     'Sunday · May 31',
      date_iso:       '2026-05-31',
      venue:          'Nararom Intersection → Thephasadin Stadium',
      img:            IMG.yaowarat,
      copy:           "3.8km of rainbow chaos through Silom. Southeast Asia's biggest Pride event, theme 'Patch The World with Pride.' Free to join.",
      cta_label:      'Join Free',
      cta_url:        'https://www.bangkokpride.org/',
      ticket_partner: null,
      is_sponsored:   false,
    },
    side: [
      { name: 'Bangkok World Music Day',
        date_label: 'Saturday · Jun 13',
        date_iso:   '2026-06-13',
        venue:      'One Bangkok & Alliance Française',
        img:        IMG.club,
        copy:       '30+ artists · 5 stages · 10 hours of free music. Voguing ballroom included.',
        cta_label:  'RSVP Free',
        cta_url:    'https://www.nationthailand.com/pr-news/pr-news/40066137',
        ticket_partner: null,
        is_sponsored: false },
      { name: 'THE KID LAROI · A Perfect World Tour',
        date_label: 'Friday · Jun 26',
        date_iso:   '2026-06-26',
        venue:      'Samyan Mitrtown Hall',
        img:        IMG.club,
        copy:       'Australian gen-Z superstar live. Going fast.',
        cta_label:  'Buy Ticket',
        cta_url:    'https://www.thaiticketmajor.com/',
        ticket_partner: 'ThaiTicketMajor',
        is_sponsored: true,
        ad_label:   'Sponsored Event' },
      { name: 'Bangkok Love Parade',
        date_label: 'Sunday · Jun 28',
        date_iso:   '2026-06-28',
        venue:      'National Stadium → EM District',
        img:        IMG.yaowarat,
        copy:       "6km closing parade — Pride month's grand finale through Siam, Ploenchit, Asok.",
        cta_label:  'Join Free',
        cta_url:    'https://www.bangkokpride.org/',
        ticket_partner: null,
        is_sponsored: false },
    ],
  },

  // D5 — Neighborhood Spotlight with sponsored quick-list slot 04
  neighborhood: {
    name:           'Silom',
    eyebrow:        'Neighborhood in Focus',
    title:          'Silom: ',
    title_italic:   'Loud, Proud, Always On',
    img:            IMG.bar,
    copy:           "For June, Silom isn't just a district — it's the world's biggest open-air party. Walk the rainbow flag, drink at Soi 4, sleep above it all, repeat.",
    quick_list: [
      { rank: '01', name: 'DJ Station',    is_sponsored: false },
      { rank: '02', name: 'Telephone Pub', is_sponsored: false },
      { rank: '03', name: 'Stranger Bar',  is_sponsored: false },
      { rank: '04', name: '[ HOT — Neighborhood Sponsor Slot ]',
        is_sponsored: true,
        ad_label:     'Neighborhood Sponsor',
        sponsor_ig:   null,
        sponsor_url:  '#' },
    ],
    cta_label: 'Explore Silom',
  },

  // Scene section — gay-bar IG cards (verified accounts only)
  scene: {
    section_title:  'The',
    section_italic: 'Silom Scene',
    section_copy:   'Where the community is gathering for Pride month.',
    spots: [
      { name: 'Beef.bkk',     handle: '@beef.bkk',
        url:  'https://www.instagram.com/beef.bkk/',
        img:  IMG.bar,
        desc: 'Masculine energy, concrete walls, dark house beats.' },
      { name: 'Boycamp',      handle: '@boycamp.th',
        url:  'https://www.instagram.com/boycamp.th/',
        img:  IMG.club,
        desc: 'Glamping-themed Sundays. Sun, water, and the crew.' },
      { name: 'Stranger Bar', handle: '@thestrangerbar',
        url:  'https://www.instagram.com/thestrangerbar/',
        img:  IMG.cocktail,
        desc: 'House of drag. Now twice the size, twice the drama.' },
    ],
  },

  is_published: true,
  published_at: FieldValue.serverTimestamp(),
}

async function main() {
  const ref = db.collection('issues').doc(issue.issue_id)
  await ref.set(issue)
  console.log(`Wrote issues/${issue.issue_id}`)
  console.log(`  top_list:    ${issue.top_list.length} items, ${issue.top_list.filter(t => t.is_sponsored).length} sponsored`)
  console.log(`  hospitality: ${issue.hospitality.columns.length} categories`)
  let agodaCount = 0
  for (const col of issue.hospitality.columns) {
    for (const h of col.hotels) if (h.agoda_url) agodaCount++
  }
  console.log(`  hotels:      ${agodaCount} with Agoda affiliate URL (CID=${AGODA_CID})`)
  console.log(`  events:      1 featured + ${issue.events.side.length} side`)
  console.log(`  hood slot04: ${issue.neighborhood.quick_list[3].is_sponsored ? 'sponsored slot active' : 'static'}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
