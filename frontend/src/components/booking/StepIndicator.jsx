export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
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
                    ? 'bg-rose-500 text-white'
                    : isActive
                    ? 'bg-rose-500 text-white ring-4 ring-rose-100'
                    : 'bg-blush-100 text-gray-400'
                }`}
              >
                {isDone ? '✓' : stepNum}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive ? 'text-rose-600' : isDone ? 'text-gray-600' : 'text-gray-400'
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
  )
}
