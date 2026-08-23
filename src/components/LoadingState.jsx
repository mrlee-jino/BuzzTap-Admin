function LoadingState({ text = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#FFD400]/20 border-t-[#FFD400] rounded-full animate-spin" />

      <p className="mt-4 text-sm text-gray-500">
        {text}
      </p>
    </div>
  )
}

export default LoadingState