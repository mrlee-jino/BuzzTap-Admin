function DropdownMenu({ options, onSelect }) {
  return (
    <div className="absolute right-0 top-full z-30 mt-2 min-w-40 overflow-hidden rounded-xl border border-white/10 bg-[#181818] py-1 shadow-2xl" role="menu">
      {options.filter(Boolean).map((option) => (
        <button key={option.label} type="button" onClick={() => onSelect(option)} className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-white/5 ${option.destructive ? "text-red-400" : "text-gray-300 hover:text-yellow-400"}`} role="menuitem">{option.label}</button>
      ))}
    </div>
  )
}

export default DropdownMenu
