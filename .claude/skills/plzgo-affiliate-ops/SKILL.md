---
name: plzgo-affiliate-ops
description: จัดการรายได้ affiliate ของ plzgo (Agoda, Klook, Ko-fi) — ตำแหน่งวาง, tracking, cache function, การเพิ่มพาร์ทเนอร์ใหม่ ใช้เมื่อปรับ placement, วิเคราะห์ CTR, แก้ getNearbyHotels หรือประเมินพาร์ทเนอร์ใหม่ Trigger: "affiliate", "Agoda", "Klook", "รายได้", "hotel card", "CTR"
---

# plzgo Affiliate Ops

## Placement ปัจจุบัน (ห้ามเพิ่มโดยไม่ผ่านกติกาข้อ 2)
| จุด | Partner | Trigger |
|---|---|---|
| BaseCampCard "Book" | Agoda live API | Centroid zone match |
| BaseCampCard "More on Agoda →" | Agoda | Per-hotel affiliate URL |
| BaseCampCard "Klook deals →" | Klook | Zone-based search URL |
| TimelineItem "Check rooms →" | Agoda | Hotel-type place |
| DonationModal | Ko-fi | Manual |

## กติกาการวาง (UX ต้องมาก่อนรายได้)
1. Affiliate ปรากฏ **หลังจาก user ได้คุณค่าแล้วเท่านั้น** (หลัง itinerary generate) — ไม่แทรกใน SwipeView เด็ดขาด flow ศักดิ์สิทธิ์
2. หนึ่งหน้าจอมี affiliate CTA เด่นได้จุดเดียว (สอดคล้อง 60-30-10: ปุ่มส้มมีได้ปุ่มเดียว)
3. ทุกลิงก์ต้องผ่าน `trackCTA()` ใน useAnalytics — ไม่มี tracking = ไม่รู้ว่าอะไร work = ห้าม ship
4. เปิดเผยว่าเป็น affiliate ในหน้า Terms (ทำแล้ว — รักษาไว้เมื่อเพิ่มพาร์ทเนอร์)

## getNearbyHotels (Cloud Function) — สิ่งที่ต้องไม่พัง
- Proxy Agoda Long Tail API, ซ่อน key ฝั่ง server (secrets: AGODA_CID, AGODA_API_KEY)
- **Cache 24 ชม.** ใน `hotels_live_cache`, key ปัดพิกัด 3 ตำแหน่ง (~110m grid) — ลดค่า API/latency
- **Fail-soft**: Agoda ล่ม → คืน `{hotels: [], fallback: true}` → client โชว์ static picks จาก Firestore แทน — ห้ามให้ card ว่าง
- Timeout 4000ms — อย่าเพิ่มโดยไม่คิด (block render)
- แก้ function แล้วต้องเทสทั้ง 3 ทาง: cache hit / cache miss / Agoda error

## เกณฑ์ประเมินพาร์ทเนอร์ใหม่ (เช่น GetYourGuide, eSIM, Grab)
ต้องตอบได้ครบก่อนเพิ่ม:
1. Commission จริงเท่าไหร่ + cookie window
2. มี deep link ระดับ place/zone ไหม (ลิงก์หน้าแรกเฉยๆ = CTR ต่ำ ไม่คุ้มพื้นที่จอ)
3. วางตรงไหนโดยไม่ละเมิดกติกาข้อ 1–2
4. Track ยังไง — เพิ่ม event name ใน taxonomy ก่อน ship

## รายงานที่ควรดูประจำ
Affiliate CTR ต่อ placement ต่อสัปดาห์ / fallback rate ของ getNearbyHotels (สูง = Agoda มีปัญหา หรือ cache ไม่ hit) / Klook vs Agoda click share ต่อ zone
