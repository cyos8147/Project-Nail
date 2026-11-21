import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ServiceSelector from './ServiceSelector.jsx'
import ServiceDetails from './ServiceDetails.jsx'
import CancelPolicyNote from '../CancelPolicyNote.jsx'
import DateTimePicker from './DateTimePicker.jsx'
import ContactForm from './ContactForm.jsx'
import StepIndicator from './StepIndicator.jsx'
import {
  createBooking,
  fileToBase64,
  getServiceCategories,
  getServices,
  getShopSettings,
  savePhone,
} from '../../api/client.js'
import { pickNailService, shadeFromCarry, takeCarryDesign } from '../../utils/carryDesign.js'

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function formatDateKey(dateKey) {
  if (!dateKey) return ''
  const [y, m, d] = dateKey.split('-').map(Number)
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`
}

// เปิดแชท LINE OA ของร้านพร้อมกรอกข้อความล่วงหน้า (ต้องเป็นรหัสคิวล้วนๆ ไม่มีคำอื่นปน
// เพราะฝั่ง webhook เช็คด้วย regex ที่ต้องตรงกับรูปแบบรหัสคิวทั้งข้อความเป๊ะๆ ดู backend/app/routers/line.py)
function buildLineAddLink(basicId, message) {
  const id = basicId.startsWith('@') ? basicId : `@${basicId}`
  return `https://line.me/R/oaMessage/${id}/?${encodeURIComponent(message)}`
}

const initialContact = { name: '', phone: '', lineId: '' }

export default function BookingWizard() {
  const [category, setCategory] = useState('hair')
  const [service, setService] = useState(null)
  const [selectedShade, setSelectedShade] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [form, setForm] = useState(initialContact)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [bookingResult, setBookingResult] = useState(null)

  const [aiStyleTag, setAiStyleTag] = useState(null)
  const [aiExtraMinutes, setAiExtraMinutes] = useState(0)
  const [carriedDesign, setCarriedDesign] = useState(null)
  const [autoPickedName, setAutoPickedName] = useState(null) // ชื่อบริการที่ระบบเลือกให้จากสีที่ลูกค้าลอง
  const autoAppliedRef = useRef(false)

  const [categories, setCategories] = useState([])
  const [servicesByCategory, setServicesByCategory] = useState({})
  const [servicesLoaded, setServicesLoaded] = useState(false)
  const [closedWeekdays, setClosedWeekdays] = useState(null)
  const [shopLineId, setShopLineId] = useState('')
  const [cancelCutoffHours, setCancelCutoffHours] = useState(0)

  // โหลดหมวดหมู่/บริการ/เวลาทำการจริงจาก backend (ถ้าเรียกไม่สำเร็จ ตัวคอมโพเนนต์ลูกจะ fallback
  // ไปใช้ src/data/bookingData.js เอง — เว็บยังใช้งานได้แม้ backend ยังไม่พร้อม)
  // servicesLoaded กันไม่ให้เลือกบริการจากข้อมูลสำรอง (id ไม่ตรงกับฐานข้อมูลจริง เช่น "wash-blow")
  // ก่อนที่ผลจริงจาก backend จะโหลดเสร็จ ซึ่งจะทำให้จองไม่สำเร็จตอนส่งข้อมูลจริง
  useEffect(() => {
    getServiceCategories()
      .then(setCategories)
      .catch(() => {})
    getServices()
      .then((list) => {
        const grouped = {}
        for (const s of list) {
          if (!grouped[s.category_id]) grouped[s.category_id] = []
          grouped[s.category_id].push(s)
        }
        setServicesByCategory(grouped)
      })
      .catch(() => {})
      .finally(() => setServicesLoaded(true))
    getShopSettings()
      .then((s) => {
        setClosedWeekdays(s.closed_weekdays)
        setShopLineId(s.line_oa_basic_id || '')
        setCancelCutoffHours(s.cancel_cutoff_hours || 0)
      })
      .catch(() => {})

    // สี/ลาย/รูปที่ส่งมาจากหน้า AI Studio (ลองสี วิเคราะห์สีผิว หรือแนะนำลาย) อ่านครั้งเดียวแล้วลบทิ้ง
    const carried = takeCarryDesign()
    if (carried) {
      setCarriedDesign(carried)
      setCategory('nail')
    }
  }, [])

  // มีสีที่ลูกค้าลองมา → เลือกบริการทำเล็บที่เกี่ยวข้องให้เลย (ลูกค้าเปลี่ยนเองได้) ทำครั้งเดียวหลังโหลดรายการบริการเสร็จ
  useEffect(() => {
    if (autoAppliedRef.current || !carriedDesign || !servicesLoaded) return
    autoAppliedRef.current = true
    const pick = pickNailService(servicesByCategory.nail, carriedDesign)
    if (pick) {
      setService(pick)
      setAutoPickedName(pick.name)
    }
  }, [carriedDesign, servicesLoaded, servicesByCategory])

  // สีจาก AI ที่จะบันทึกในใบจอง ใช้เฉพาะบริการทำเล็บ (ถ้าลูกค้าเปลี่ยนไปทำผม สีเล็บไม่เกี่ยว)
  const carriedShade = useMemo(() => (category === 'nail' ? shadeFromCarry(carriedDesign) : null), [carriedDesign, category])

  const needsDetailsStep = category === 'nail' || (category === 'hair' && service?.isColor)

  const steps = useMemo(
    () => (needsDetailsStep ? ['เลือกบริการ', 'รายละเอียดเพิ่มเติม', 'วันและเวลา', 'ข้อมูลติดต่อ'] : ['เลือกบริการ', 'วันและเวลา', 'ข้อมูลติดต่อ']),
    [needsDetailsStep]
  )

  const [step, setStep] = useState(1)
  const totalSteps = steps.length

  function resetServiceRelatedState() {
    setSelectedShade(null)
    setImageFile(null)
    setImagePreview(null)
    setSelectedDate(null)
    setSelectedTime(null)
    setAiStyleTag(null)
    setAiExtraMinutes(0)
  }

  function handleCategoryChange(newCategory) {
    setCategory(newCategory)
    setService(null)
    resetServiceRelatedState()
  }

  function handleServiceChange(newService) {
    setService(newService)
    setSelectedShade(null)
    setImageFile(null)
    setImagePreview(null)
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setAiStyleTag(null)
    setAiExtraMinutes(0)
  }

  function handleContactChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function isStepValid(currentStep) {
    const stepName = steps[currentStep - 1]
    if (stepName === 'เลือกบริการ') return !!service
    if (stepName === 'รายละเอียดเพิ่มเติม') return true
    if (stepName === 'วันและเวลา') return !!selectedDate && !!selectedTime
    return true
  }

  function goNext() {
    if (!isStepValid(step)) return
    if (step < totalSteps) setStep(step + 1)
  }

  function goBack() {
    if (step > 1) setStep(step - 1)
  }

  function validateContact() {
    const next = {}
    if (!form.name.trim()) next.name = 'กรุณากรอกชื่อ-นามสกุล'
    if (!form.phone.trim()) {
      next.phone = 'กรุณากรอกเบอร์โทร'
    } else if (!/^0[0-9]{8,9}$/.test(form.phone.trim())) {
      next.phone = 'รูปแบบเบอร์โทรไม่ถูกต้อง'
    }
    if (!form.lineId.trim()) next.lineId = 'กรุณากรอกไอดีไลน์'
    return next
  }

  async function handleConfirm() {
    const nextErrors = validateContact()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      let referenceImageBase64 = null
      if (imageFile) {
        referenceImageBase64 = await fileToBase64(imageFile)
      } else if (carriedDesign?.reference_image_base64) {
        // ลายที่ออกแบบเองจาก AI ลองเล็บ (คนละแบบกับ carriedDesign.nail_design_id ที่มาจากแคตตาล็อก)
        referenceImageBase64 = carriedDesign.reference_image_base64
      }

      const result = await createBooking({
        category_id: category,
        service_id: service.id,
        shade_id: (selectedShade ?? carriedShade)?.id ?? null,
        shade_name: (selectedShade ?? carriedShade)?.name ?? null,
        nail_design_id: carriedDesign?.nail_design_id ?? null,
        reference_image_base64: referenceImageBase64,
        ai_style_tag: aiStyleTag,
        ai_extra_minutes: aiExtraMinutes,
        booking_date: selectedDate,
        booking_time: selectedTime,
        customer_name: form.name,
        customer_phone: form.phone,
        line_id: form.lineId,
      })

      savePhone(form.phone)
      setBookingResult(result)
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message || 'บันทึกการจองไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หรือติดต่อร้านโดยตรงถ้ายังไม่หาย')
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setCategory('hair')
    setService(null)
    setSelectedShade(null)
    setImageFile(null)
    setImagePreview(null)
    setSelectedDate(null)
    setSelectedTime(null)
    setForm(initialContact)
    setErrors({})
    setSubmitted(false)
    setSubmitError(null)
    setBookingResult(null)
    setCarriedDesign(null)
    setAutoPickedName(null)
    setStep(1)
  }

  const currentStepName = steps[step - 1]
  const estimatedDuration = (service?.duration_minutes ?? service?.duration ?? 60) + aiExtraMinutes

  if (submitted) {
    return (
      <section id="booking" className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="bg-white rounded-3xl shadow-card p-10">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="font-display text-2xl font-bold text-gray-800">จองคิวสำเร็จแล้ว!</h2>
          <p className="text-gray-500 mt-2">ขอบคุณที่ใช้บริการ Lucky Salon</p>

          <div className="mt-6 bg-blush-50 border border-blush-200 rounded-2xl p-5 max-w-xs mx-auto text-left space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">บริการ</span>
              <span className="font-medium text-gray-800">{service?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">วันที่</span>
              <span className="font-medium text-gray-800">{formatDateKey(selectedDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">เวลา</span>
              <span className="font-medium text-gray-800">{selectedTime} น.</span>
            </div>
            {bookingResult?.booking_code && (
              <div className="flex justify-between items-center text-sm pt-2.5 mt-1 border-t border-blush-200">
                <span className="text-gray-500">รหัสคิว</span>
                <span className="font-display font-bold text-rose-600">{bookingResult.booking_code}</span>
              </div>
            )}
          </div>

          <div className="mt-4 max-w-xs mx-auto">
            {shopLineId && bookingResult?.booking_code ? (
              <>
                <a
                  href={buildLineAddLink(shopLineId, bookingResult.booking_code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-[#06C755] hover:brightness-95 text-white text-sm font-semibold py-3 rounded-full transition-all"
                >
                  💬 ผูก LINE รับแจ้งเตือนคิวอัตโนมัติ
                </a>
                <p className="text-[11px] text-gray-400 mt-2">
                  เปิดแชท LINE ร้านพร้อมกรอกรหัสคิวให้แล้ว กดส่งได้เลย
                </p>
              </>
            ) : (
              <div className="bg-white border border-blush-200 rounded-2xl p-4 flex gap-3 text-left">
                <span className="text-lg leading-none">💡</span>
                <p className="text-xs text-gray-500 leading-relaxed">
                  เพิ่มเพื่อน LINE ของร้าน (ดูไอดีได้ที่ท้ายเว็บไซต์) แล้วพิมพ์รหัสคิวส่งในแชท
                  เพื่อรับแจ้งเตือนอัตโนมัติเมื่อร้านยืนยันหรือแก้ไขคิว
                </p>
              </div>
            )}
          </div>
          <CancelPolicyNote hours={cancelCutoffHours} className="mt-4 max-w-xs mx-auto" />
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a href="/history" className="bg-white hover:bg-blush-100 text-rose-600 text-sm font-semibold px-6 py-3 rounded-full border border-blush-200 transition-colors">
              ดูประวัติของฉัน
            </a>
            <button
              onClick={handleReset}
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              จองคิวเพิ่ม
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="booking" className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-2">
        <h2 className="font-display text-3xl font-bold text-gray-800">จองคิวออนไลน์</h2>
        <p className="text-gray-500 mt-2">ดูปฏิทิน เลือกเวลาว่าง และเลือกบริการที่ต้องการได้ในที่เดียว</p>
      </div>

      <div className="bg-white rounded-3xl shadow-card p-6 sm:p-10 mt-8">
        <StepIndicator steps={steps} currentStep={step} />

        {currentStepName === 'เลือกบริการ' && (
          servicesLoaded ? (
            <>
              {carriedDesign && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  {carriedDesign.reference_image_base64 ? (
                    <img src={carriedDesign.reference_image_base64} alt="รูปที่ลองสีจาก AI" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-white" />
                  ) : (
                    <span className="w-14 h-14 rounded-xl border border-black/10 flex-shrink-0" style={{ backgroundColor: carriedShade?.hex || carriedDesign.color_hex || '#F4C6CE' }} />
                  )}
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-semibold text-gray-800">จองต่อจาก AI Studio{carriedDesign.summary ? `: ${carriedDesign.summary}` : ''}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {autoPickedName ? `เลือกบริการ “${autoPickedName}” ให้แล้ว เปลี่ยนเป็นบริการอื่นได้` : 'เลือกบริการที่ต้องการด้านล่าง'}
                    </p>
                    {carriedDesign.imageDropped && (
                      <p className="text-xs text-amber-600 mt-0.5">รูปที่ลองสีส่งมาไม่ได้ (พื้นที่เบราว์เซอร์เต็ม) แต่สีที่เลือกยังอยู่ครบ</p>
                    )}
                  </div>
                </div>
              )}
            <ServiceSelector
              category={category}
              setCategory={handleCategoryChange}
              service={service}
              setService={handleServiceChange}
              categories={categories}
              servicesByCategory={servicesByCategory}
            />
            </>
          ) : (
            <p className="text-center text-gray-400 text-sm py-12">กำลังโหลดข้อมูลบริการ...</p>
          )
        )}

        {currentStepName === 'รายละเอียดเพิ่มเติม' && (
          <ServiceDetails
            category={category}
            service={service}
            selectedShade={selectedShade}
            setSelectedShade={setSelectedShade}
            imagePreview={imagePreview}
            imageName={imageFile?.name}
            imageFile={imageFile}
            onImageChange={handleImageChange}
            carriedDesign={carriedDesign}
            onClearCarriedDesign={() => setCarriedDesign(null)}
            onAiAnalyzed={({ styleTag, extraMinutes }) => {
              setAiStyleTag(styleTag)
              setAiExtraMinutes(extraMinutes)
            }}
          />
        )}

        {currentStepName === 'วันและเวลา' && (
          <DateTimePicker
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            serviceDurationMinutes={estimatedDuration}
            categoryId={category}
            closedWeekdays={closedWeekdays}
          />
        )}

        {currentStepName === 'ข้อมูลติดต่อ' && (
          <ContactForm
            category={category}
            service={service}
            selectedShade={selectedShade ?? carriedShade}
            referenceImage={imagePreview || carriedDesign?.reference_image_base64 || null}
            durationMinutes={estimatedDuration}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            form={form}
            onChange={handleContactChange}
            errors={errors}
          />
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-blush-100">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-gray-500 hover:bg-blush-100 disabled:opacity-0 transition-colors"
          >
            ย้อนกลับ
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!isStepValid(step)}
              className="bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 disabled:cursor-not-allowed text-white font-semibold px-7 py-2.5 rounded-full shadow-card transition-colors"
            >
              ถัดไป
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="bg-rose-500 hover:bg-rose-600 disabled:bg-blush-200 disabled:cursor-not-allowed text-white font-semibold px-7 py-2.5 rounded-full shadow-card transition-colors"
            >
              {submitting ? 'กำลังบันทึก...' : 'ยืนยันการจองคิว'}
            </button>
          )}
        </div>
        {step === totalSteps && <CancelPolicyNote hours={cancelCutoffHours} className="mt-6" />}
        {step === totalSteps && (
          <p className="mt-4 text-center text-xs text-gray-400">
            การกดยืนยันการจองถือว่ารับทราบ{' '}
            <Link to="/privacy" target="_blank" className="underline hover:text-rose-600">
              นโยบายความเป็นส่วนตัว
            </Link>
          </p>
        )}
        {submitError && <p className="text-sm text-red-500 text-center mt-4">{submitError}</p>}
      </div>
    </section>
  )
}
