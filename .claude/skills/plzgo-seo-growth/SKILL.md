---
name: plzgo-seo-growth
description: กลยุทธ์ SEO และ growth ของ plzgo — programmatic pages จากข้อมูล places, ข้อจำกัด SPA บน Firebase Hosting, schema markup, content angle ใช้เมื่อวางแผน SEO, สร้างหน้า landing, เขียน meta, หรือวิเคราะห์ traffic Trigger: "SEO", "landing page", "traffic", "Google ไม่เจอ", "content plan"
---

# plzgo SEO & Growth

## ⚠️ ข้อจำกัดโครงสร้างที่ต้องรู้ก่อน (สำคัญสุด)
plzgo เป็น **Vue SPA (Vite) บน Firebase Hosting** — HTML แรกที่ Google เห็นแทบว่างเปล่า มีแค่ meta ใน `index.html` ตัวเดียว
ผลคือ: จะทำ programmatic SEO หลายร้อยหน้า **ต้องมี prerender/SSG ก่อน** ไม่งั้นเขียน content เท่าไหร่ก็ index ไม่ติด
ทางเลือกเรียงตามแรงน้อย→มาก:
1. **Prerender เฉพาะหน้า static** (landing, /zone/*, /itinerary/*) ด้วย vite-plugin-prerender หรือ prerender ตอน build
2. **ย้ายเป็น Nuxt 3** — SSG/SSR เต็มรูปแบบ (งานใหญ่ ตัดสินใจเมื่อ SEO พิสูจน์แล้วว่าเป็น channel หลัก)
3. Firebase Functions ทำ dynamic rendering — ไม่แนะนำ เพิ่มค่าใช้จ่าย+ความซับซ้อน

## Programmatic Page Matrix (จากข้อมูลที่มีอยู่แล้ว)
ทุกหน้า generate จาก Master CSV — ไม่เขียนมือ:
| Pattern | ตัวอย่าง | จำนวนโดยประมาณ |
|---|---|---|
| zone × สิ่งที่ทำ | "Things to do in Silom" | 8 zones |
| vibe × duration | "Chill 1-day Bangkok itinerary" | vibe ~10 × mode 3 |
| type × zone | "Best street food in Chinatown" | เลือกคู่ที่มี ≥5 places |
| คำถาม long-tail | "Is Chatuchak open on Monday?" | จาก opening_hours |

กติกา: หน้าไหนมี places < 5 ไม่สร้าง (thin content) / ทุกหน้า embed แผนที่ + CTA "Build your own route"

## Schema Markup
- หน้า itinerary: `TouristTrip` + `ItemList`
- หน้า place: `TouristAttraction` / `Restaurant` (ใช้ type field map)
- ทุกหน้า: `BreadcrumbList`

## Meta ปัจจุบัน (อย่าถอย)
canonical, OG, Twitter card ทำไว้ครบใน index.html แล้ว — หน้าที่ generate ใหม่ต้องได้มาตรฐานเดียวกัน + og:image เฉพาะหน้า

## Growth Channel นอก SEO
- **Share loop มีอยู่แล้ว**: `/route/:id` permalink — วัด share rate ผ่าน `trackCTA()` และทำให้หน้า RouteView มี CTA กลับเข้า funnel ชัดๆ ("Make your own — free")
- TikTok/IG: ใช้ plzgo-voice เขียน hook จาก insight ที่มีอยู่ — 730 insights = คลัง content สำเร็จรูป
- Reddit r/ThailandTourism, r/Bangkok — ตอบคำถามจริงแล้วแนบ route ที่ generate ให้ (ห้าม spam link เปล่า)

## KPI ที่ควรตาม
Indexed pages, organic sessions → swipe start rate → itinerary completion → affiliate CTR (เชื่อมกับ useAnalytics events)
