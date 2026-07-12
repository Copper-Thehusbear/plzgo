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
          <h1 class="text-3xl md:text-4xl font-black tracking-tight mb-2" style="color:var(--navy)">Privacy Policy</h1>
          <p class="text-sm text-slate-400 font-bold mb-10">Last updated: May 2025</p>
          <div class="legal-body">

            <h2>1. Information We Collect</h2>
            <p>plzgo does not require account registration or login. We do not collect personally identifiable information such as your name, email address, or phone number.</p>
            <p>The following data is recorded automatically by our systems:</p>
            <ul>
              <li><strong>Route data</strong> — The list of places you select is saved to Firebase Firestore to generate a shareable link. This data is not linked to your identity.</li>
              <li><strong>Analytics</strong> — We use Firebase Analytics to understand aggregate usage patterns, such as total visitors and popular vibe selections. This data is anonymised and not linked to individuals.</li>
              <li><strong>Session data</strong> — Your current trip state (vibe, swiped places) is stored in browser memory only and is cleared when you close the tab.</li>
            </ul>

            <h2>2. How We Use Your Data</h2>
            <p>We use data to:</p>
            <ul>
              <li>Generate and display the travel itinerary you create</li>
              <li>Improve the quality of the app and place recommendations</li>
              <li>Analyse usage trends to build new features</li>
            </ul>
            <p>We do not sell, rent, or share your data with third parties for marketing purposes.</p>

            <h2>3. Affiliate Links</h2>
            <p>plzgo may include affiliate links to booking platforms such as Agoda and Klook. We may earn a commission if you make a purchase through these links, at no additional cost to you.</p>

            <h2>4. Cookies &amp; Local Storage</h2>
            <p>We use browser localStorage to remember your language preference (English/Thai). We do not use third-party tracking cookies.</p>

            <h2>5. Data Retention</h2>
            <p>Routes saved in Firestore are retained for as long as necessary to support shared links. We may periodically remove old, unused route data.</p>

            <h2>6. Your Rights</h2>
            <p>To view, correct, or delete any data associated with your use of plzgo, contact us at <a href="mailto:worapun.ld@gmail.com">worapun.ld@gmail.com</a>.</p>

            <h2>7. Changes to This Policy</h2>
            <p>We may update this policy from time to time. The "Last updated" date at the top of this page reflects the most recent revision. Continued use of plzgo after changes constitutes acceptance of the updated policy.</p>

          </div>
        </template>

        <!-- Thai -->
        <template v-else>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight mb-2" style="color:var(--navy)">นโยบายความเป็นส่วนตัว</h1>
          <p class="text-sm text-slate-400 font-bold mb-10">อัปเดตล่าสุด: พฤษภาคม 2025</p>
          <div class="legal-body">

            <h2>1. ข้อมูลที่เราเก็บรวบรวม</h2>
            <p>plzgo ไม่มีระบบสมัครสมาชิกหรือล็อกอิน เราไม่เก็บข้อมูลส่วนตัวที่ระบุตัวตนได้ เช่น ชื่อ อีเมล หรือหมายเลขโทรศัพท์</p>
            <p>ข้อมูลที่ระบบของเราบันทึกโดยอัตโนมัติมีดังนี้:</p>
            <ul>
              <li><strong>Route data</strong> — รายการสถานที่ที่คุณเลือกถูกบันทึกใน Firebase Firestore เพื่อสร้าง shareable link โดยไม่ผูกกับตัวตน</li>
              <li><strong>Analytics</strong> — เราใช้ Firebase Analytics เพื่อติดตามการใช้งานในภาพรวม เช่น จำนวนผู้เข้าใช้ vibe ที่ถูกเลือก ข้อมูลเหล่านี้เป็น aggregate ไม่ระบุตัวบุคคล</li>
              <li><strong>Session data</strong> — สถานะทริปปัจจุบันเก็บใน browser memory เท่านั้น หายไปเมื่อปิดหน้าต่าง</li>
            </ul>

            <h2>2. วิธีที่เราใช้ข้อมูล</h2>
            <p>เราใช้ข้อมูลเพื่อ:</p>
            <ul>
              <li>สร้างและแสดงเส้นทางท่องเที่ยวที่คุณออกแบบ</li>
              <li>ปรับปรุงคุณภาพของแอปและข้อมูลสถานที่</li>
              <li>วิเคราะห์แนวโน้มการใช้งานเพื่อพัฒนาฟีเจอร์ใหม่</li>
            </ul>
            <p>เราไม่ขาย ไม่ให้เช่า และไม่แบ่งปันข้อมูลใด ๆ กับบุคคลที่สามเพื่อวัตถุประสงค์ทางการตลาด</p>

            <h2>3. Affiliate Links</h2>
            <p>plzgo อาจมีลิงก์พันธมิตรไปยัง Agoda และ Klook เราอาจได้รับค่าคอมมิชชั่นหากคุณทำการจองผ่านลิงก์เหล่านี้ โดยไม่มีค่าใช้จ่ายเพิ่มเติมสำหรับคุณ</p>

            <h2>4. Cookies และ Local Storage</h2>
            <p>เราใช้ localStorage ของ browser เพื่อจำการตั้งค่าภาษา ไม่มีการใช้ third-party tracking cookies</p>

            <h2>5. การเก็บรักษาข้อมูล</h2>
            <p>Route ที่บันทึกใน Firestore จะถูกเก็บไว้ตามระยะเวลาที่จำเป็น เราอาจลบข้อมูลเก่าที่ไม่มีการใช้งานเป็นระยะ</p>

            <h2>6. สิทธิ์ของคุณ</h2>
            <p>หากคุณต้องการขอดู แก้ไข หรือลบข้อมูล ติดต่อเราได้ที่ <a href="mailto:worapun.ld@gmail.com">worapun.ld@gmail.com</a></p>

            <h2>7. การเปลี่ยนแปลงนโยบาย</h2>
            <p>เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว โดยจะแจ้งวันที่อัปเดตไว้ที่ด้านบนของหน้านี้</p>

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
