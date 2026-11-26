import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ServiceSelector from './ServiceSelector.jsx'
import ServiceDetails from './ServiceDetails.jsx'
import CancelPolicyNote from '../CancelPolicyNote.jsx'
import DateTimePicker from './DateTimePicker.jsx'
import ContactForm from './ContactForm.jsx'
import ExtraServicesPicker from './ExtraServicesPicker.jsx'
import StepIndicator from './StepIndicator.jsx'
import {
  createBooking,
  createMultiBooking,
  fileToBase64,
  getServiceCategories,
  getServices,
  getShopSettings,
  saveBookingCode,
  savePhone,
} from '../../api/client.js'
import { pickNailService, shadeFromCarry, takeCarryDesign } from '../../utils/carryDesign.js'
import { buildChain, chainParam, chainTotals } from '../../utils/multiBooking.js'
import ZoomableImage from '../ZoomableImage.jsx'
import { CrownBear } from '../Decor.jsx'
import CarriedDesignThumb from './CarriedDesignThumb.jsx'

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
  const [extras, setExtras] = useState([]) // บริการที่ทำต่อจากบริการหลัก ตามลำดับ (ข้อ 2.2)
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
  const [codeCopied, setCodeCopied] = useState(false)

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

  // กดลูกศรจากการ์ดบริการหน้าแรก (/booking?service=<id>) → เลือกบริการนั้นให้เลย ทำครั้งเดียว
  // ถ้ามีสีที่ส่งมาจากหน้า AI ให้ใช้ทางนั้นก่อน (ลูกค้าเปลี่ยนบริการเองได้เสมอ)
  const urlServiceAppliedRef = useRef(false)
  useEffect(() => {
    if (urlServiceAppliedRef.current || !servicesLoaded || carriedDesign) return
    urlServiceAppliedRef.current = true
    const wanted = new URLSearchParams(window.location.search).get('service')
    if (!wanted) return
    const found = Object.values(servicesByCategory).flat().find((s) => String(s.id) === wanted)
    if (found) {
      setCategory(found.category_id)
      setService(found)
    }
  }, [servicesLoaded, servicesByCategory, carriedDesign])

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
    setExtras([])
    resetServiceRelatedState()
  }

  function handleServiceChange(newService) {
    setService(newService)
    setExtras((prev) => prev.filter((s) => s.id !== newService?.id))
    setSelectedTime(null)
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
    if (!form.name.trim()) next.name = 'รบกวนกรอกชื่อ-นามสกุลด้วยนะคะ'
    if (!form.phone.trim()) {
      next.phone = 'รบกวนกรอกเบอร์โทรด้วยนะคะ'
    } else if (!/^0[0-9]{8,9}$/.test(form.phone.trim())) {
      next.phone = 'เบอร์โทรดูไม่ครบ ลองเช็กอีกครั้งนะคะ'
    }
    if (!form.lineId.trim()) next.lineId = 'รบกวนกรอกไอดีไลน์ด้วยนะคะ'
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

      const mainItem = {
        category_id: category,
        service_id: service.id,
        shade_id: (selectedShade ?? carriedShade)?.id ?? null,
        shade_name: (selectedShade ?? carriedShade)?.name ?? null,
        nail_design_id: carriedDesign?.nail_design_id ?? null,
        reference_image_base64: referenceImageBase64,
        ai_style_tag: aiStyleTag,
        ai_extra_minutes: aiExtraMinutes,
      }
      const contact = {
        booking_date: selectedDate,
        booking_time: selectedTime,
        customer_name: form.name,
        customer_phone: form.phone,
        line_id: form.lineId,
      }
      let result
      if (isMulti) {
        // สี/รูปที่ส่งมาจาก AI Studio เป็นของบริการทำเล็บ: ถ้าบริการหลักไม่ใช่ทำเล็บ แนบไปกับบริการทำเล็บตัวแรกในชุดแทน
        const carriedNail = category !== 'nail' && carriedDesign ? shadeFromCarry(carriedDesign) : null
        let carriedUsed = false
        const extraItems = extras.map((s) => {
          const item = { category_id: s.category_id, service_id: s.id }
          if (carriedDesign && category !== 'nail' && !carriedUsed && s.category_id === 'nail') {
            carriedUsed = true
            return {
              ...item,
              shade_id: carriedNail?.id ?? null,
              shade_name: carriedNail?.name ?? null,
              nail_design_id: carriedDesign.nail_design_id ?? null,
              reference_image_base64: carriedDesign.reference_image_base64 ?? null,
            }
          }
          return item
        })
        const list = await createMultiBooking({ items: [mainItem, ...extraItems], ...contact })
        result = { ...list[0], all: list }
      } else {
        result = await createBooking({ ...mainItem, ...contact })
      }

      savePhone(form.phone)
      // จำรหัสคิวไว้ในเครื่อง หน้า "ประวัติของฉัน" จะเปิดดู/ยกเลิก/เลื่อนคิวได้ทันทีโดยไม่ต้องพิมพ์รหัสเอง
      if (result?.booking_code) saveBookingCode(result.booking_code)
      setBookingResult(result)
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message || 'จองไม่สำเร็จ ลองกดยืนยันอีกครั้งนะคะ ถ้ายังไม่ได้ ทักหรือโทรหาร้านได้เลยค่ะ')
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setCategory('hair')
    setService(null)
    setExtras([])
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
    setCodeCopied(false)
    setCarriedDesign(null)
    setAutoPickedName(null)
    setStep(1)
  }

  // เปลี่ยนชุดบริการ → เวลาที่เลือกไว้อาจไม่ว่างสำหรับชุดใหม่ ให้เลือกเวลาใหม่
  const extrasKey = extras.map((x) => x.id).join(',')
  const lastExtrasKey = useRef(extrasKey)
  useEffect(() => {
    if (lastExtrasKey.current !== extrasKey) {
      lastExtrasKey.current = extrasKey
      setSelectedTime(null)
    }
  }, [extrasKey])

  const currentStepName = steps[step - 1]
  const estimatedDuration = (service?.duration_minutes ?? service?.duration ?? 60) + aiExtraMinutes
  const allServices = useMemo(() => Object.values(servicesByCategory).flat(), [servicesByCategory])
  const isMulti = extras.length > 0
  const chain = useMemo(() => buildChain(service, extras, selectedTime, aiExtraMinutes), [service, extras, selectedTime, aiExtraMinutes])
  const multiParam = isMulti ? chainParam(chain) : null

  if (submitted) {
    return (
      <section id="booking" className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="glass-solid rounded-3xl p-10">
          <CrownBear className="mx-auto mb-2 w-28" />
          <h2 className="font-display text-2xl font-semibold text-gray-800">จองคิวสำเร็จแล้ว</h2>
          <p className="text-gray-500 mt-2">ขอบคุณที่เลือก Lucky Salon นะคะ แล้วเจอกันค่ะ</p>

          <div className="mt-6 bg-blush-50 border border-blush-200 rounded-2xl p-5 max-w-xs mx-auto text-left space-y-2.5">
            {bookingResult?.all ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">วันที่</span>
                  <span className="font-medium text-gray-800">{formatDateKey(selectedDate)}</span>
                </div>
                {bookingResult.all.map((b, i) => (
                  <div key={b.id} className="text-sm pt-2 border-t border-blush-200">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-gray-800">{i + 1}. {b.service_name}</span>
                      <span className="text-gray-600 whitespace-nowrap">{b.booking_time} น.</span>
                    </div>
                    <p className="text-xs text-gray-400">รหัสคิว <span className="font-display font-bold text-berry">{b.booking_code}</span></p>
                  </div>
                ))}
              </>
            ) : (
              <>
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
              </>
            )}
            {bookingResult?.booking_code && !bookingResult?.all && (
              <div className="flex justify-between items-center text-sm pt-2.5 mt-1 border-t border-blush-200">
                <span className="text-gray-500">รหัสคิว</span>
                <span className="font-display font-bold text-berry">{bookingResult.booking_code}</span>
              </div>
            )}
          </div>

          <div className="mt-5 max-w-sm mx-auto text-left bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-amber-800">สถานะตอนนี้: รอร้านยืนยันคิว</p>
            <ul className="mt-2 space-y-1.5 text-xs text-amber-900/80 leading-relaxed list-disc pl-4">
              <li>เก็บ<b>รหัสคิว</b>ไว้ (แคปหน้าจอนี้ หรือกดคัดลอก) ใช้คู่กับเบอร์โทรเพื่อดูสถานะ เลื่อน หรือยกเลิกคิว</li>
              <li>ดูได้ตลอดที่หน้า <a href="/history" className="underline font-semibold">ประวัติของฉัน</a> เครื่องนี้จำรหัสคิวไว้ให้แล้ว</li>
              <li>ถ้ายังไม่ได้ผูก LINE จะยังไม่มีข้อความเตือนนะคะ แวะเข้ามาเช็กสถานะก่อนวันนัด หรือโทรถามร้านได้เลยค่ะ</li>
            </ul>
            {bookingResult?.booking_code && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(bookingResult.booking_code).then(() => setCodeCopied(true)).catch(() => {})
                }}
                className="mt-3 w-full bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 text-sm font-semibold py-2.5 rounded-full transition-colors"
              >
                {codeCopied ? 'คัดลอกรหัสคิวแล้ว' : `คัดลอกรหัสคิว ${bookingResult.booking_code}`}
              </button>
            )}
          </div>

          <div className="mt-4 max-w-sm mx-auto">
            {shopLineId && bookingResult?.booking_code ? (
              <>
                <a
                  href={buildLineAddLink(shopLineId, bookingResult.booking_code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-candy btn-line gap-2 text-sm py-3"
                >
                  💬 ผูก LINE รับแจ้งเตือนคิวอัตโนมัติ
                </a>
                <p className="text-[11px] text-gray-400 mt-2">
                  เปิดแชท LINE ร้านพร้อมกรอกรหัสคิวให้แล้ว กดส่งได้เลย (ไม่บังคับ)
                </p>
              </>
            ) : (
              <div className="bg-white border border-blush-200 rounded-2xl p-4 flex gap-3 text-left">
                <span className="text-lg leading-none">💡</span>
                <p className="text-xs text-gray-500 leading-relaxed">
                  อยากได้แจ้งเตือนอัตโนมัติ: เพิ่มเพื่อน LINE ของร้าน (ดูไอดีได้ที่ท้ายเว็บไซต์) แล้วพิมพ์รหัสคิวส่งในแชท
                </p>
              </div>
            )}
          </div>
          <CancelPolicyNote hours={cancelCutoffHours} className="mt-4 max-w-xs mx-auto" />
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a href="/history" className="btn-candy-soft text-sm px-6 py-3">
              ดูประวัติของฉัน
            </a>
            <button
              onClick={handleReset}
              className="btn-candy px-6 py-3"
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
        <h2 className="font-display text-3xl font-semibold text-gray-800">จองคิวออนไลน์</h2>
        <p className="text-gray-500 mt-2">เลือกบริการ วัน และเวลาที่สะดวก แล้วกรอกชื่อกับเบอร์โทรก็เสร็จแล้วค่ะ</p>
      </div>

      <div className="glass-solid rounded-3xl p-6 sm:p-10 mt-8">
        <StepIndicator steps={steps} currentStep={step} />

        {currentStepName === 'เลือกบริการ' && (
          servicesLoaded ? (
            <>
              {carriedDesign && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  {carriedDesign.reference_image_base64 ? (
                    <ZoomableImage src={carriedDesign.reference_image_base64} alt="รูปที่ลองสีจาก AI" caption={carriedDesign.summary} className="w-16 h-16 rounded-xl flex-shrink-0 bg-white" />
                  ) : carriedDesign.source === 'design' && carriedDesign.nail_design_id ? (
                    <CarriedDesignThumb designId={carriedDesign.nail_design_id} name={carriedDesign.nail_design_name} fallbackHex={carriedDesign.color_hex} />
                  ) : (
                    <span className="w-14 h-14 rounded-xl border border-black/10 flex-shrink-0" style={{ backgroundColor: carriedShade?.hex || carriedDesign.color_hex || '#F4C6CE' }} />
                  )}
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-semibold text-[#4A2A37]">
                      {carriedDesign.source === 'design'
                        ? `ลายที่เลือก: ${carriedDesign.nail_design_name || carriedDesign.summary || 'ลายเล็บ'}`
                        : `จองต่อจาก AI Studio${carriedDesign.summary ? `: ${carriedDesign.summary}` : ''}`}
                    </p>
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
            <ExtraServicesPicker
              main={service}
              extras={extras}
              setExtras={setExtras}
              allServices={allServices}
              categories={categories}
              mainExtraMinutes={aiExtraMinutes}
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
            chainParam={multiParam}
            chainPreview={isMulti ? (t) => buildChain(service, extras, t, aiExtraMinutes) : null}
          />
        )}

        {currentStepName === 'ข้อมูลติดต่อ' && (
          <ContactForm
            category={category}
            service={service}
            selectedShade={selectedShade ?? carriedShade}
            referenceImage={imagePreview || carriedDesign?.reference_image_base64 || null}
            durationMinutes={isMulti ? chainTotals(chain).minutes : estimatedDuration}
            chain={isMulti ? chain : null}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            form={form}
            onChange={handleContactChange}
            errors={errors}
          />
        )}

        {/* Navigation buttons: ติดขอบล่างจอบนมือถือ กดถัดไปได้โดยไม่ต้องเลื่อนลงไปหา พร้อมสรุปสิ่งที่เลือกและบอกว่ายังขาดอะไร */}
        <div className="sticky bottom-0 z-20 -mx-6 sm:mx-0 mt-10 px-6 sm:px-0 py-4 sm:pt-6 bg-white/95 backdrop-blur border-t border-blush-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="btn-candy-soft text-sm px-4 py-2 disabled:invisible"
          >
            ย้อนกลับ
          </button>

          <div className="flex-1 min-w-0 text-center text-xs leading-snug" aria-live="polite">
            {service ? (
              <p className="text-gray-600 truncate">
                <span className="font-semibold text-gray-800">{[service.name, ...extras.map((x) => x.name)].join(' + ')}</span>
                {' · '}{isMulti ? chainTotals(chain).price : service.price} บาท
                {selectedDate && selectedTime ? ` · ${formatDateKey(selectedDate)} ${selectedTime} น.` : ''}
              </p>
            ) : null}
            {!isStepValid(step) && (
              <p className="text-rose-500 font-medium">
                {currentStepName === 'เลือกบริการ' ? 'เลือกบริการก่อน' : currentStepName === 'วันและเวลา' ? (selectedDate ? 'เลือกเวลาที่ว่าง' : 'เลือกวันจากปฏิทิน') : ''}
              </p>
            )}
          </div>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!isStepValid(step)}
              className="btn-candy px-6 sm:px-7 py-2.5 whitespace-nowrap"
            >
              ถัดไป
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="btn-candy px-7 py-2.5"
            >
              {submitting ? 'กำลังบันทึก...' : 'ยืนยันการจองคิว'}
            </button>
          )}
        </div>
        {step === totalSteps && <CancelPolicyNote hours={cancelCutoffHours} className="mt-6" />}
        {step === totalSteps && (
          <p className="mt-4 text-center text-xs text-gray-400">
            การกดยืนยันการจองถือว่ารับทราบ{' '}
            <Link to="/privacy" target="_blank" className="underline hover:text-berry">
              นโยบายความเป็นส่วนตัว
            </Link>
          </p>
        )}
        {submitError && <p className="text-sm text-red-500 text-center mt-4">{submitError}</p>}
      </div>
    </section>
  )
}
