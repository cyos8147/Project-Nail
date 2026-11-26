import Icon from '../Icon.jsx'
export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="mb-10">
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {steps.map((step, i) => {
        const stepNum = i + 1
        const isActive = stepNum === currentStep
        const isDone = stepNum < currentStep
        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isDone
                    ? 'bg-[#C2185B] text-white'
                    : isActive
                    ? 'bg-[#C2185B] text-white ring-4 ring-[#FFEAF2]'
                    : 'bg-blush-100 text-[#6B5560]'
                }`}
              >
                {isDone ? <Icon name="check" className="h-4 w-4" strokeWidth={2.5} /> : stepNum}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive ? 'text-[#C2185B]' : isDone ? 'text-[#5B4650]' : 'text-[#6B5560]'
                }`}
              >
                {step}
              </span>
            </div>
            {stepNum < steps.length && <div className="w-6 sm:w-10 h-px bg-blush-200" />}
          </div>
        )
      })}
    </div>
      {/* มือถือซ่อนชื่อขั้นข้างวงกลม จึงบอกชื่อขั้นปัจจุบันไว้ใต้แถบ */}
      <p className="sm:hidden mt-3 text-center text-sm text-[#5B4650]" >
        ขั้นที่ {currentStep}/{steps.length} · <span className="font-semibold text-[#C2185B]">{steps[currentStep - 1]}</span>
      </p>
    </div>
  )
}
