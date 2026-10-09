// ข้อความนโยบายยกเลิก/เลื่อนคิว (ขึ้นตอนจอง หลังจองสำเร็จ และหน้าแก้ไขคิว)
// ร้านที่ตั้งเวลาล่วงหน้าไว้จะเห็นตัวเลขชัดเจน ร้านที่ยังไม่ตั้ง (0) จะเห็นข้อความขอความร่วมมือแบบไม่มีเวลาบังคับ
export default function CancelPolicyNote({ hours = 0, className = '' }) {
  return (
    <div className={`flex gap-3 bg-blush-50 border border-blush-200 rounded-2xl p-4 text-left ${className}`}>
      <span className="text-lg leading-none" aria-hidden="true">🗓️</span>
      <p className="text-xs text-gray-600 leading-relaxed">
        {hours > 0 ? (
          <>
            <span className="font-semibold text-gray-700">ยกเลิกหรือเลื่อนคิวได้ล่วงหน้าอย่างน้อย {hours} ชั่วโมง</span>
            {' '}ก่อนเวลานัด ผ่านเมนู "ประวัติของฉัน" บนเว็บนี้ หากใกล้เวลานัดกว่านั้นรบกวนติดต่อร้านโดยตรง
          </>
        ) : (
          <>
            <span className="font-semibold text-gray-700">หากไม่สะดวกมาตามนัด</span>
            {' '}รบกวนยกเลิกหรือเลื่อนคิวล่วงหน้าที่เมนู "ประวัติของฉัน" หรือแจ้งร้านทาง LINE เพื่อให้ลูกค้าท่านอื่นได้ใช้เวลานั้นแทน
          </>
        )}
      </p>
    </div>
  )
}
