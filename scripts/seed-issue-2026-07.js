#!/usr/bin/env node
/**
 * Seeds Firestore `issues/2026-07` — July 2026 Plzgo Explore issue.
 *
 * 5-Dimension Ad Infrastructure (same as 2026-06):
 *   D1 header_banner   — Powered-by ribbon under hero (Ambient Brand slot)
 *   D2 top_list        — 10-item editorial list; ranks 02/05/08 are Native Ads
 *   D3 hospitality     — 3-col grid: Luxury · Hostel · Concert (each with Agoda affiliate URL)
 *   D4 events          — featured + side cards with ticket/RSVP CTAs
 *   D5 neighborhood    — quick-list of 4; slot 04 is Neighborhood Sponsor
 *
 * Editorial angle: monsoon month + Bangkok's densest concert calendar of the year.
 *
 * Data sources (researched Jul 2026):
 *   - July concert calendar (ITZY/JAY B/XG/natori/BADBADNOTGOOD, all via ThaiTicketMajor)
 *       → thefinestthai.com July 2026 ticket guide
 *   - HONNE 10 Year Anniversary Asia Tour Jul 25-26 @ KBank Siam Pic-Ganesha → EverythingBKK
 *   - Khao Phansa (Buddhist Lent) Jul 11 → timeanddate / thaiholidayguide
 *   - New venues: ÆTHER, The NORM, Wild Iris, Sala Saneha, Piscari, Khaoya Archive
 *       → Time Out Bangkok "7 best new bars of 2026"
 *   - Roast8ry Anuwong Rd → Time Out Bangkok "20 best new cafes of 2026"
 *
 * IG-handle policy (same as June): only link handles VERIFIED against a live
 * instagram.com profile page. Everything unverified stays null and the template
 * hides the link. This month's sponsored top-list slots are all null-IG until
 * partners confirm their accounts.
 *
 * Hotel affiliate links use Agoda partnersearch with our CID (1964186):
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

function agodaSearch(hotelName) {
  const q = encodeURIComponent(`${hotelName} Bangkok`)
  return `https://www.agoda.com/partners/partnersearch.aspx?cid=${AGODA_CID}&textToSearch=${q}&dest_id=${BANGKOK_DEST_ID}`
}

// Venue photography from official channels only — NO generic stock (see June notes).
// Every slot without a verified official photo stays null → styled placeholder in UI.
const IMG = {
  rooftop: null, wine: null, cocktail: null, cafe: null, club: null,
  museum: null, gallery: null, livehouse: null, hood: null,
}

// Verified Agoda CDN photo carried over from the `hotels` collection.
const HOTEL_IMG = {
  standardMahanakhon: 'https://pix4.agoda.net/hotelimages/29858837/-1/34fac5a0d8819ff651a2466e5294ba1f.jpg?s=600x400&ca=29&ce=0',
}

const issue = {
  issue_id:       '2026-07',
  issue_label:    'Issue 07 · July 2026',
  editorial_vibe: 'Monsoon Mode',

  hero: {
    title_top:    'Bangkok',
    title_italic: 'Loves The Rain',
    intro:        "Monsoon season, and the city couldn't care less. July is Bangkok's loudest concert month of the year, the new rooftops opened anyway, and everything worth doing has a roof. Mostly.",
  },

  // D2 title is rendered by ExploreView — kept data-driven so we never hardcode a month again.
  top_list_title:  'The',
  top_list_italic: 'July List',
  top_list_copy:   "Ten places you can't miss this month.",

  // D1 — Anchor Header Banner. sponsor_brand=null = HOT slot available.
  header_banner: {
    is_active:     true,
    ad_label:      'POWERED BY',
    sponsor_brand: null,
    placeholder:   '[ HOT — Issue Sponsor Slot ]',
    sponsor_ig:    null,
    sponsor_url:   null,
    tagline:       'Sponsored Issue · July 2026',
  },

  spotlight: {
    eyebrow:      'The Spotlight',
    title:        'Saladaeng',
    title_italic: 'Goes Vertical',
    img:          IMG.rooftop,
    img_caption:  'Dusit Central Park · Rama IV',
    copy:         "The old Dusit Thani corner grew a skyline. ÆTHER pours cocktails on the 44th floor with 360° views, The NORM stacked four lounges of Fritz Hansen furniture next door, and Lumphini Park is your carpet. Rainy season's best seat is now 200 meters up.",
    cta_text:     'Add Saladaeng to my route',
  },

  // D2 — Top 10. Ranks 02 / 05 / 08 are Native Ads.
  top_list: [
    { rank: '01', name: 'ÆTHER',           zone: 'Saladaeng',    img: IMG.rooftop,
      desc: "44 floors above Dusit Central Park, 360-degree views, DJ from sunset. The rooftop opening of the year — go on a clear evening between storms.",
      tag: 'Hottest', is_sponsored: false },

    { rank: '02', name: 'Wild Iris',       zone: 'Bang Rak',     img: IMG.wine,
      desc: "French Riviera mood across two floors overlooking Lumphini Park. Mediterranean plates, spritz-heavy list, zero effort required.",
      tag: 'Hot',     is_sponsored: true,
      ad_label: 'Partner Pick',
      partner_ig: null,
      partner_url: null },

    { rank: '03', name: 'Sala Saneha',     zone: 'Silom',        img: IMG.wine,
      desc: "A 70-year-old shophouse on Soi Decho hiding a wine bar, restaurant, bookstore and a tiny cinema. 2,000+ bottles, then an indie flick. Monsoon-proof.",
      tag: 'New',     is_sponsored: false },

    { rank: '04', name: 'Piscari',         zone: 'One Bangkok',  img: IMG.rooftop,
      desc: "Mediterranean rooftop on the 23rd floor of Andaz One Bangkok. Aperitivo cocktails, grilled octopus, sunset that slides into late-night.",
      tag: 'New',     is_sponsored: false },

    { rank: '05', name: 'The NORM',        zone: 'Saladaeng',    img: IMG.club,
      desc: "A sky-high social club furnished with 100+ pieces of iconic Fritz Hansen design. Four lounge zones, one dress code: look like you belong.",
      tag: 'Hot',     is_sponsored: true,
      ad_label: 'Partner Pick',
      partner_ig: null,
      partner_url: null },

    { rank: '06', name: 'Khaoya Archive',  zone: 'Ari',          img: IMG.cocktail,
      desc: "Cocktails built on local Thai ingredients, classic structures, no theatrics. The bar that finally gives Ari a reason to stay past dinner.",
      tag: 'Local Gem', is_sponsored: false },

    { rank: '07', name: 'Roast8ry',        zone: 'Yaowarat',     img: IMG.cafe,
      desc: "The world latte-art champion came down from Chiang Mai and set up a long performance bar on Anuwong Road. Watch the pour, then apologize to your home machine.",
      tag: 'New',     is_sponsored: false },

    { rank: '08', name: 'Volume Livehouse', zone: 'Ratchada',    img: IMG.livehouse,
      desc: "The Street Ratchada's 5th-floor livehouse is stacked all season — 60+ Thai artists across themed nights, plus BADBADNOTGOOD dropping in Jul 16.",
      tag: 'Hot',     is_sponsored: true,
      ad_label: 'Partner Pick',
      partner_ig: null,
      partner_url: null },

    { rank: '09', name: 'Jim Thompson House', zone: 'Siam',      img: IMG.museum,
      desc: "The teakwood house of the silk king who vanished in 1967. Canal-side, jungle garden, air of mystery included. The classic rainy-afternoon move.",
      tag: 'Classic', is_sponsored: false },

    { rank: '10', name: 'BACC',            zone: 'Siam',         img: IMG.gallery,
      desc: "Bangkok Art & Culture Centre — free entry, nine floors, rotating Thai contemporary shows. Directly connected to BTS National Stadium, so you never touch the rain.",
      tag: 'Classic', is_sponsored: false },
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
        category_copy:  '5-star, edgy design. Green-season rates are real.',
        hotels: [
          { name: '[ HOT — Premium Hotel Slot ]',
            zone: 'Sukhumvit',  img: IMG.rooftop,
            deal: 'Up to 25% off July nights',
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
            zone: 'Silom',       img: IMG.club,
            deal: 'Walk to Patpong + BTS Sala Daeng. Co-working downstairs.',
            ig:   '@lubdexperience',
            ig_url: 'https://www.instagram.com/lubdexperience/',
            agoda_url: agodaSearch('Lub d Bangkok Silom'),
            is_sponsored: false },
          { name: '[ HOT — Hostel Slot ]',
            zone: 'Ari',         img: IMG.cafe,
            deal: 'New opening · ask about monsoon rates',
            ig:   null, ig_url: null,
            agoda_url: null,
            is_sponsored: true, ad_label: 'New Partner' },
        ],
      },
      {
        key: 'concert',
        accent_letter: 'C',
        category_label: 'Concert Crash Pads',
        category_copy:  "July is gig month. Sleep next to the venue, skip the 1am ride-hail surge.",
        hotels: [
          { name: 'Novotel Bangkok IMPACT',
            zone: 'Muang Thong', img: IMG.club,
            deal: 'Connected to IMPACT Arena — XG plays Jul 19.',
            ig:   null, ig_url: null,
            agoda_url: agodaSearch('Novotel Bangkok IMPACT'),
            is_sponsored: false },
          { name: 'ibis Bangkok IMPACT',
            zone: 'Muang Thong', img: IMG.cafe,
            deal: 'The budget bed 5 minutes from the arena doors.',
            ig:   null, ig_url: null,
            agoda_url: agodaSearch('ibis Bangkok IMPACT'),
            is_sponsored: false },
          { name: '[ HOT — Concert Hotel Slot ]',
            zone: 'Siam',        img: IMG.livehouse,
            deal: 'Walk home from Siam Pic-Ganesha after HONNE',
            ig:   null, ig_url: null,
            agoda_url: null,
            is_sponsored: true, ad_label: 'Gig Partner' },
        ],
      },
    ],
  },

  // D4 — Event Ticket Conversion Gate
  events: {
    section_title:  'July',
    section_italic: 'On Sale',
    section_copy:   'Reserve before it sells out.',
    featured: {
      name:           'HONNE · 10 Year Anniversary Asia Tour',
      date_label:     'Sat–Sun · Jul 25–26',
      date_iso:       '2026-07-25',
      venue:          'KBank Siam Pic-Ganesha Theatre, Siam Square',
      img:            IMG.livehouse,
      copy:           "The English electronic-soul duo picked Bangkok as the first Southeast Asian stop of their anniversary tour — two nights in a 1,000-seat theatre. This will not stay on sale.",
      cta_label:      'Get Tickets',
      cta_url:        'https://www.thaiticketmajor.com/',
      ticket_partner: 'ThaiTicketMajor',
      is_sponsored:   false,
    },
    side: [
      { name: 'BADBADNOTGOOD Live',
        date_label: 'Thursday · Jul 16',
        date_iso:   '2026-07-16',
        venue:      'Volume Livehouse · The Street Ratchada',
        img:        IMG.livehouse,
        copy:       'The Toronto jazz-not-jazz quartet in an actual livehouse, not an arena. Correct.',
        cta_label:  'Buy Ticket',
        cta_url:    'https://www.thaiticketmajor.com/',
        ticket_partner: 'ThaiTicketMajor',
        is_sponsored: false },
      { name: 'XG · The Core World Tour',
        date_label: 'Sunday · Jul 19',
        date_iso:   '2026-07-19',
        venue:      'IMPACT Arena, Muang Thong Thani',
        img:        IMG.club,
        copy:       'The J-pop girl group returns to IMPACT. Expect choreography your knees could never.',
        cta_label:  'Buy Ticket',
        cta_url:    'https://www.thaiticketmajor.com/',
        ticket_partner: 'ThaiTicketMajor',
        is_sponsored: true,
        ad_label:   'Sponsored Event' },
      { name: 'natori Live in Bangkok',
        date_label: 'Tuesday · Jul 28',
        date_iso:   '2026-07-28',
        venue:      'UOB Live, EMSPHERE',
        img:        IMG.livehouse,
        copy:       "The Japanese bedroom-pop phenom's first Bangkok show, at Sukhumvit's newest arena.",
        cta_label:  'Buy Ticket',
        cta_url:    'https://www.thaiticketmajor.com/',
        ticket_partner: 'ThaiTicketMajor',
        is_sponsored: false },
    ],
  },

  // D5 — Neighborhood Spotlight with sponsored quick-list slot 04
  neighborhood: {
    name:           'Ari',
    eyebrow:        'Neighborhood in Focus',
    title:          'Ari: ',
    title_italic:   'Slow Sois, Strong Coffee',
    img:            IMG.hood,
    copy:           "Bangkok's softest neighborhood is built for wet-season pacing: khao soi when it pours, third-wave coffee while it drizzles, and now a proper cocktail bar for when it finally stops. Five BTS stops from Siam, a full mood away.",
    quick_list: [
      { rank: '01', name: 'Khaoya Archive',  is_sponsored: false },
      { rank: '02', name: 'Ongtong Khaosoi', is_sponsored: false },
      { rank: '03', name: 'Lay Lao',         is_sponsored: false },
      { rank: '04', name: '[ HOT — Neighborhood Sponsor Slot ]',
        is_sponsored: true,
        ad_label:     'Neighborhood Sponsor',
        sponsor_ig:   null,
        sponsor_url:  '#' },
    ],
    cta_label: 'Explore Ari',
  },

  // Scene section — same verified IG accounts as June (all confirmed live profiles);
  // copy refreshed for post-Pride July.
  scene: {
    section_title:  'Still',
    section_italic: 'The Scene',
    section_copy:   "Pride month ended. Silom didn't notice.",
    spots: [
      { name: 'Beef.bkk',     handle: '@beef.bkk',
        url:  'https://www.instagram.com/beef.bkk/',
        img:  IMG.club,
        desc: 'Masculine energy, concrete walls, dark house beats.' },
      { name: 'Boycamp',      handle: '@boycamp.th',
        url:  'https://www.instagram.com/boycamp.th/',
        img:  IMG.club,
        desc: 'Glamping-themed Sundays — rain just makes it camp-ier.' },
      { name: 'Stranger Bar', handle: '@thestrangerbar',
        url:  'https://www.instagram.com/thestrangerbar/',
        img:  IMG.cocktail,
        desc: 'House of drag. Twice the size, twice the drama.' },
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
