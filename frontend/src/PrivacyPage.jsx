import { useEffect, useState } from 'react'
import { getShopSettings } from '../api/client.js'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'

const UPDATED_AT = '30 กันยายน 2569'

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold text-gray-800">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-gray-600">{children}</div>
    </section>
  )
}

function Bullets({ items }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.slice(0, 40)} className="flex gap-3">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPage() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    const previous = document.title
    document.title = 'นโยบายความเป็นส่วนตัว | Lucky Salon'
    window.scrollTo(0, 0)
    getShopSettings()
      .then(setSettings)
      .catch(() => {})
    return () => {
      document.title = previous
    }
  }, [])

  const phone = settings?.phone?.trim()
  const lineId = settings?.line_oa_basic_id?.trim()

  return (
    <div className="min-h-screen bg-blush-50 text-gray-800">
      <Header />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-bold text-gray-800">นโยบายความเป็นส่วนตัว</h1>
        <p className="mt-2 text-sm text-gray-400">ปรับปรุงล่าสุด {UPDATED_AT}</p>
        <p className="mt-6 leading-relaxed text-gray-600">
          Lucky Salon (&ldquo;ร้าน&rdquo;) ให้ความสำคัญกับข้อมูลส่วนบุคคลของคุณ
          หน้านี้อธิบายว่าเว็บไซต์นี้เก็บข้อมูลอะไร เก็บไปทำอะไร ใครดูได้ และคุณมีสิทธิ์อะไรบ้าง
        </p>

        <Section title="1. ข้อมูลที่เราเก็บ และเก็บเมื่อไร">
          <Bullets
            items={[
              'ตอนจองคิว: ชื่อ-นามสกุล เบอร์โทรศัพท์ ไอดีไลน์ (ถ้ากรอก) บริการ วันและเวลาที่จอง และรูปตัวอย่างลายเล็บที่คุณแนบ (ถ้าแนบ)',
              'ตอนเชื่อมบัญชี LINE: รหัสผู้ใช้ LINE (LINE user ID) ที่ระบบได้รับเมื่อคุณผูกบัญชีกับ LINE Official Account ของร้าน ใช้สำหรับส่งข้อความยืนยันและเตือนคิว',
              'ตอนเขียนรีวิว: คะแนน ข้อความ และรูป (ถ้าแนบ) รีวิวจะแสดงบนหน้าเว็บพร้อมชื่อที่คุณใช้จอง',
              'ตอนตอบแบบสอบถามแนะนำลายเล็บ: คำตอบของคุณ เช่น โทนผิว ทรงเล็บ ความยาว สไตล์ และโอกาสที่จะใช้ พร้อมเบอร์โทร (ถ้ากรอก) เพื่อเชื่อมกับประวัติของคุณ',
              'ตอนใช้ AI ลองเล็บ วิเคราะห์สีผิว หรือวิเคราะห์ลาย: รูปที่คุณอัปโหลดถูกส่งไปประมวลผลชั่วคราวเพื่อหาตำแหน่งเล็บหรือวิเคราะห์เท่านั้น ร้านไม่ได้บันทึกรูปนี้ไว้ ยกเว้นเมื่อคุณกด "จองลายนี้" หรือแนบรูปในการจอง รูปนั้นจะถูกเก็บเป็นรูปตัวอย่างของคิวนั้น',
              'ข้อมูลการใช้งานทั่วไป: ระบบจำกัดจำนวนครั้งการเรียกใช้งานต่อที่อยู่ IP เพื่อป้องกันการใช้งานผิดปกติ ผู้ให้บริการเว็บอาจเก็บบันทึกการเข้าใช้งานตามปกติ เช่น IP address และเว็บโหลดฟอนต์จาก Google Fonts',
            ]}
          />
        </Section>

        <Section title="2. เราใช้ข้อมูลเพื่ออะไร">
          <Bullets
            items={[
              'จัดการคิว ยืนยัน เลื่อน หรือยกเลิกการจอง',
              'ส่งข้อความยืนยัน แจ้งสถานะ และเตือนนัดล่วงหน้าผ่าน LINE (เฉพาะผู้ที่เชื่อมบัญชี LINE)',
              'ติดต่อคุณเกี่ยวกับบริการที่จองไว้',
              'แสดงรีวิวที่คุณเขียนบนเว็บไซต์',
              'ปรับปรุงบริการและระบบแนะนำลายเล็บของร้าน',
            ]}
          />
        </Section>

        <Section title="3. ใครเห็นข้อมูลของคุณ">
          <p>
            เฉพาะเจ้าหน้าที่ของร้านที่มีบัญชีเข้าหน้าจัดการเท่านั้นที่ดูข้อมูลการจองและข้อมูลลูกค้าได้
            ร้านไม่ขายข้อมูลของคุณ และไม่เปิดเผยให้บุคคลอื่น นอกจากผู้ให้บริการระบบที่จำเป็นต่อการทำงานของเว็บ
            หรือกรณีที่กฎหมายกำหนด ผู้ให้บริการที่เกี่ยวข้อง ได้แก่
          </p>
          <Bullets
            items={[
              'Supabase: เก็บฐานข้อมูลและไฟล์รูปภาพ',
              'Render: เซิร์ฟเวอร์ประมวลผลของเว็บ',
              'Vercel: เว็บไซต์ส่วนที่คุณเห็นและใช้งาน',
              'LINE: ส่งข้อความยืนยันและเตือนคิว',
            ]}
          />
          <p>ผู้ให้บริการเหล่านี้อาจเก็บข้อมูลบนเซิร์ฟเวอร์ที่อยู่ในต่างประเทศ</p>
        </Section>

        <Section title="4. เก็บนานแค่ไหน">
          <p>
            ร้านเก็บข้อมูลไว้เท่าที่จำเป็นต่อการให้บริการและการติดต่อกับคุณ
            หากต้องการให้ลบข้อมูล แจ้งร้านได้ตามช่องทางด้านล่าง
          </p>
        </Section>

        <Section title="5. สิทธิของคุณ">
          <p>
            คุณขอดูหรือขอสำเนาข้อมูลของคุณ ขอให้แก้ไขให้ถูกต้อง ขอให้ลบหรือระงับการใช้ข้อมูล
            คัดค้านการใช้ข้อมูล หรือถอนความยินยอมที่เคยให้ไว้ได้ โดยติดต่อร้านตามช่องทางด้านล่าง
            ร้านจะดำเนินการภายในเวลาอันสมควร
          </p>
        </Section>

        <Section title="6. ติดต่อร้าน">
          <p>
            Lucky Salon
            {phone && <> · โทร {phone}</>}
            {lineId && <> · LINE {lineId}</>}
            {!phone && !lineId && <> · ติดต่อได้ตามช่องทางที่ระบุไว้ท้ายหน้าแรก</>}
          </p>
        </Section>

        <Section title="7. การเปลี่ยนแปลงนโยบาย">
          <p>ร้านอาจปรับปรุงนโยบายนี้เป็นครั้งคราว โดยจะแก้วันที่ปรับปรุงล่าสุดไว้ที่ด้านบนของหน้านี้</p>
        </Section>
      </main>

      <Footer />
    </div>
  )
}
