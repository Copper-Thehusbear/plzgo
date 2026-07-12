<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const lang = ref('en')
</script>

<template>
  <div class="legal-root">
    <!-- Nav -->
    <nav class="glass-nav fixed top-0 left-0 right-0 z-50 h-16"
      style="padding-top: max(env(safe-area-inset-top), 0px);">
      <div class="max-w-4xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
        <button @click="router.push('/')"
          class="text-2xl font-black tracking-tighter"
          style="color:var(--navy); background:none; border:none; cursor:pointer;">
          plz<span style="color:var(--orange)">go</span>
        </button>
        <div class="flex items-center gap-3">
          <!-- Language toggle -->
          <div class="lang-toggle">
            <button :class="['lang-btn', lang === 'en' && 'lang-btn--active']" @click="lang = 'en'">EN</button>
            <button :class="['lang-btn', lang === 'th' && 'lang-btn--active']" @click="lang = 'th'">TH</button>
          </div>
          <button class="m-back-btn" @click="router.back()">
            <i class="fa-solid fa-arrow-left" style="font-size:11px"></i>
            {{ lang === 'th' ? 'กลับ' : 'Back' }}
          </button>
        </div>
      </div>
    </nav>

    <div class="max-w-4xl mx-auto px-4 md:px-6 py-28">
      <div class="glass-panel p-8 md:p-12">
        <p class="text-[11px] font-black uppercase tracking-[0.2em] mb-3" style="color:var(--orange)">Legal</p>

        <!-- English -->
        <template v-if="lang === 'en'">
          <h1 class="text-3xl md:text-4xl font-black tracking-tight mb-2" style="color:var(--navy)">Terms of Use</h1>
          <p class="text-sm text-slate-400 font-bold mb-10">Last updated: May 2025</p>
          <div class="legal-body">

            <h2>1. Acceptance of Terms</h2>
            <p>By using plzgo.me, you agree to these Terms of Use. If you do not agree, please stop using the service.</p>

            <h2>2. Nature of the Service</h2>
            <p>plzgo is a Bangkok travel planning tool that suggests places to visit, restaurants, and activities. Content is curated by our team and may be updated continuously.</p>

            <h2>3. Disclaimer of Liability</h2>
            <p>Place information, opening hours, prices, and other details may change at any time. We recommend verifying information with official sources before travelling.</p>
            <p>plzgo is not liable for any damages, losses, or issues arising from your use of the information in the app, including but not limited to closed venues, changed prices, or events outside our control.</p>

            <h2>4. Affiliate Links &amp; Commercial Relationships</h2>
            <p>plzgo may include affiliate links to booking platforms such as Agoda and Klook. We may receive a commission when you make a purchase through these links, at no additional cost to you. Our editorial opinions and place selections remain independent of commercial relationships.</p>

            <h2>5. Intellectual Property</h2>
            <p>All content, text, graphics, and code on plzgo are the property of plzgo. You may not use, reproduce, or distribute them without permission.</p>
            <p>Some images are sourced from Unsplash and are subject to the Unsplash License of their respective creators.</p>

            <h2>6. Changes to the Service</h2>
            <p>We reserve the right to modify, suspend, or discontinue any part or all of plzgo at any time without prior notice.</p>

            <h2>7. Governing Law</h2>
            <p>These Terms are governed by Thai law. Any disputes shall be subject to the jurisdiction of Thai courts.</p>

            <h2>8. Contact Us</h2>
            <p>If you have questions about these Terms, contact us at <a href="mailto:worapun.ld@gmail.com">worapun.ld@gmail.com</a>.</p>

          </div>
        </template>

        <!-- Thai -->
        <template v-else>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight mb-2" style="color:var(--navy)">ข้อตกลงการใช้งาน</h1>
          <p class="text-sm text-slate-400 font-bold mb-10">อัปเดตล่าสุด: พฤษภาคม 2025</p>
          <div class="legal-body">

            <h2>1. การยอมรับข้อตกลง</h2>
            <p>การใช้งาน plzgo.me ถือว่าคุณยอมรับข้อตกลงการใช้งานฉบับนี้ หากคุณไม่ยอมรับ กรุณาหยุดใช้งานบริการ</p>

            <h2>2. ลักษณะของบริการ</h2>
            <p>plzgo เป็นเครื่องมือช่วยวางแผนการท่องเที่ยวในกรุงเทพฯ โดยให้คำแนะนำสถานที่ท่องเที่ยว ร้านอาหาร และกิจกรรมต่าง ๆ ข้อมูลในแอปมาจากการคัดสรรโดยทีมงาน และอาจมีการปรับปรุงอย่างต่อเนื่อง</p>

            <h2>3. ข้อจำกัดความรับผิดชอบ</h2>
            <p>ข้อมูลสถานที่ เวลาเปิด-ปิด ราคา และรายละเอียดต่าง ๆ อาจมีการเปลี่ยนแปลงได้ตลอดเวลา เราแนะนำให้ตรวจสอบข้อมูลกับแหล่งอ้างอิงอย่างเป็นทางการก่อนเดินทาง</p>
            <p>plzgo ไม่รับผิดชอบต่อความเสียหาย ความสูญเสีย หรือปัญหาใด ๆ ที่เกิดขึ้นจากการใช้ข้อมูลในแอป รวมถึงแต่ไม่จำกัดเพียง สถานที่ปิด ราคาที่เปลี่ยนแปลง หรือเหตุการณ์ที่อยู่นอกเหนือการควบคุม</p>

            <h2>4. Affiliate Links และความสัมพันธ์เชิงพาณิชย์</h2>
            <p>plzgo อาจมีลิงก์พันธมิตรไปยังแพลตฟอร์มจองที่พักและกิจกรรม เช่น Agoda และ Klook เราอาจได้รับค่าตอบแทนเมื่อคุณทำการซื้อผ่านลิงก์เหล่านี้ ซึ่งไม่ส่งผลกระทบต่อราคาที่คุณจ่าย ความคิดเห็นและการคัดสรรสถานที่ยังคงเป็นอิสระจากความสัมพันธ์เชิงพาณิชย์</p>

            <h2>5. ทรัพย์สินทางปัญญา</h2>
            <p>เนื้อหา ข้อความ กราฟิก และโค้ดทั้งหมดบน plzgo เป็นทรัพย์สินของ plzgo ห้ามนำไปใช้ ทำซ้ำ หรือเผยแพร่โดยไม่ได้รับอนุญาต</p>
            <p>รูปภาพบางส่วนมาจาก Unsplash และอยู่ภายใต้ Unsplash License ของผู้สร้างต้นฉบับ</p>

            <h2>6. การเปลี่ยนแปลงบริการ</h2>
            <p>เราขอสงวนสิทธิ์ในการแก้ไข เปลี่ยนแปลง ระงับ หรือหยุดให้บริการ plzgo ไม่ว่าส่วนใดหรือทั้งหมด ได้ตลอดเวลาโดยไม่ต้องแจ้งล่วงหน้า</p>

            <h2>7. กฎหมายที่ใช้บังคับ</h2>
            <p>ข้อตกลงนี้อยู่ภายใต้กฎหมายไทย ข้อพิพาทใด ๆ ให้อยู่ในเขตอำนาจของศาลไทย</p>

            <h2>8. ติดต่อเรา</h2>
            <p>หากมีคำถามเกี่ยวกับข้อตกลงนี้ ติดต่อได้ที่ <a href="mailto:worapun.ld@gmail.com">worapun.ld@gmail.com</a></p>

          </div>
        </template>
      </div>
    </div>

    <footer class="border-t py-8" style="border-color: rgba(255,255,255,0.4);">
      <div class="max-w-4xl mx-auto px-4 md:px-6 text-center">
        <p class="text-xs text-slate-400 font-bold">
          © 2025 plzgo ·
          <router-link to="/privacy" class="hover:text-slate-600 transition-colors">Privacy Policy</router-link>
          ·
          <router-link to="/terms" class="hover:text-slate-600 transition-colors">Terms of Use</router-link>
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.legal-root { min-height: 100vh; }

.lang-toggle {
  display: flex;
  background: rgba(30,41,59,0.06);
  border-radius: 99px;
  padding: 3px;
  gap: 2px;
}
.lang-btn {
  font-size: 11px; font-weight: 800;
  letter-spacing: 0.06em;
  padding: 4px 12px; border-radius: 99px;
  border: none; cursor: pointer;
  background: transparent;
  color: rgba(30,41,59,0.4);
  font-family: 'IBM Plex Sans Thai', 'Inter', sans-serif;
  transition: all 0.2s;
}
.lang-btn--active {
  background: white;
  color: var(--navy);
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

.legal-body { display: flex; flex-direction: column; }
.legal-body h2 {
  font-size: 17px; font-weight: 800; color: var(--navy);
  margin: 32px 0 10px; letter-spacing: -0.01em;
}
.legal-body h2:first-child { margin-top: 0; }
.legal-body p {
  font-size: 14px; color: #475569; line-height: 1.8;
  margin-bottom: 12px;
}
.legal-body ul {
  list-style: disc; padding-left: 20px; margin-bottom: 12px;
}
.legal-body ul li {
  font-size: 14px; color: #475569; line-height: 1.8; margin-bottom: 6px;
}
.legal-body a { color: var(--orange); text-decoration: none; font-weight: 600; }
.legal-body a:hover { text-decoration: underline; }
</style>
