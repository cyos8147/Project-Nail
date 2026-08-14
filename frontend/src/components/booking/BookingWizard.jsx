import { useEffect, useMemo, useState } from 'react'
import ServiceSelector from './ServiceSelector.jsx'
import ServiceDetails from './ServiceDetails.jsx'
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

const initialContact = { name: '', phone: '', lineId: '' }
const CARRY_DESIGN_KEY = 'nailglow_carry_design'

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

  const [categories, setCategories] = useState([])
  const [servicesByCategory, setServicesByCategory] = useState({})
  const [closedWeekdays, setClosedWeekdays] = useState(null)

  // โหลดหมวดหมู่/บริการ/เวลาทำการจริงจาก backend (ถ้าเรียกไม่สำเร็จ ตัวคอมโพเนนต์ลูกจะ fallback
  // ไปใช้ src/data/bookingData.js เอง — เว็บยังใช้งานได้แม้ backend ยังไม่พร้อม)
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
    getShopSettings()
      .then((s) => setClosedWeekdays(s.closed_weekdays))
      .catch(() => {})

    // ลายที่ถูก "จองลายนี้" มาจากหน้า AI Studio (AdvancedRecommend / ServerTryOn)
    const raw = localStorage.getItem(CARRY_DESIGN_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        setCarriedDesign(parsed)
        setCategory('nail')
      } catch {
        /* ignore */
      }
      localStorage.removeItem(CARRY_DESIGN_KEY)
    }
  }, [])

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
      }

      const result = await createBooking({
        category_id: category,
        service_id: service.id,
        shade_id: selectedShade?.id ?? null,
        shade_name: selectedShade?.name ?? null,
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
          <p className="text-gray-500 mt-2">
            {service?.name} วันที่ {selectedDate} เวลา {selectedTime} น. ทางร้านจะติดต่อกลับผ่านไลน์ไอดี{' '}
            <span className="font-medium text-rose-600">{form.lineId}</span> เพื่อยืนยันอีกครั้ง
          </p>
          {bookingResult?.booking_code && (
            <div className="mt-6 bg-blush-50 border border-blush-200 rounded-2xl p-5 inline-block">
              <p className="text-xs text-gray-400">รหัสคิวของคุณ (เก็บไว้ตรวจสอบสถานะ)</p>
              <p className="font-display text-2xl font-bold text-rose-600 mt-1">{bookingResult.booking_code}</p>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a href="/status" className="bg-white hover:bg-blush-100 text-rose-600 text-sm font-semibold px-6 py-3 rounded-full border border-blush-200 transition-colors">
              ตรวจสอบสถานะคิว
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
          <ServiceSelector
            category={category}
            setCategory={handleCategoryChange}
            service={service}
            setService={handleServiceChange}
            categories={categories}
            servicesByCategory={servicesByCategory}
          />
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
            closedWeekdays={closedWeekdays}
          />
        )}

        {currentStepName === 'ข้อมูลติดต่อ' && (
          <ContactForm
            category={category}
            service={service}
            selectedShade={selectedShade}
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
        {submitError && <p className="text-sm text-red-500 text-center mt-4">{submitError}</p>}
      </div>
    </section>
  )
}
