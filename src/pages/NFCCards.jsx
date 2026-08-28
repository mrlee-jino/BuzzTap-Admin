import { useState } from "react"
import Modal from "../components/Modal"
import Toast from "../components/Toast"
import DropdownMenu from "../components/DropdownMenu"
import ConfirmModal from "../components/ConfirmModal"

const initialCards = [
  { id: "BT-0001", business: "CyberHub Gaming Station", owner: "Juan Dela Cruz", balance: 350, status: "Active" },
  { id: "BT-0002", business: "Bean & Byte Cafe", owner: "Maria Santos", balance: 120, status: "Active" },
  { id: "BT-0003", business: "NextLevel Computer Shop", owner: "Alex Reyes", balance: 580, status: "Active" },
  { id: "BT-0004", business: "Pixel Point", owner: "Carlo Santos", balance: 35, status: "Low Balance" },
  { id: "BT-0005", business: "CyberHub Gaming Station", owner: "Angela Cruz", balance: 0, status: "Inactive" },
]

function NFCCards() {
  const [cards, setCards] = useState(initialCards)
  const [filter, setFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ cardId: "", business: "", customer: "", balance: "0", status: "Active" })
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState("")
  const shown = cards.filter((card) => {
    const query = search.toLowerCase()
    const matchesSearch = [card.id, card.business, card.owner].some((value) => value.toLowerCase().includes(query))
    const matchesFilter = filter === "All" || (filter === "Low Balance" ? card.balance <= 50 : card.status === filter)
    return matchesSearch && matchesFilter
  })
  const saveCard = (event) => {
    event.preventDefault()
    const customer = form.customer.trim()
    if (!form.cardId.trim() || !form.business.trim() || !customer) return
    const balance = Number(form.balance) || 0
    setCards((current) => [...current, { id: form.cardId || `BT-${String(current.length + 1).padStart(4, "0")}`, business: form.business, owner: customer, balance, status: form.status || (balance <= 50 ? "Low Balance" : "Active") }])
    setModal(null); setToast("NFC card registered successfully.")
  }
  const addBalance = (event) => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!amount || amount < 1) return
    setCards((current) => current.map((card) => card.id === modal.card.id ? { ...card, balance: card.balance + amount, status: "Active" } : card))
    setModal(null); setToast("NFC card balance updated successfully.")
  }
  const changeStatus = () => { setCards((current) => current.map((card) => card.id === confirm.card.id ? { ...card, status: confirm.status } : card)); setToast(`Card ${confirm.status.toLowerCase()}`); setConfirm(null) }
  const options = (card) => [{ label: "View Details", onClick: () => setModal({ type: "details", card }) }, { label: "Add Balance", onClick: () => { setForm({ amount: "" }); setModal({ type: "balance", card }) } }, { label: "Edit", onClick: () => setToast("Card details are managed during registration") }, card.status === "Inactive" ? { label: "Activate", onClick: () => setConfirm({ card, status: "Active" }) } : { label: "Deactivate", onClick: () => setConfirm({ card, status: "Inactive" }), destructive: true }]
  return <div className="space-y-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">Card Management</p><h1 className="mt-2 text-4xl font-bold">NFC Cards</h1><p className="mt-2 text-gray-500">Manage BuzzTap NFC cards across registered businesses.</p></div><button onClick={() => { setForm({ business: "", owner: "", balance: "0" }); setModal({ type: "register" }) }} className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black">+ Register NFC Card</button></div><div className="grid grid-cols-1 gap-4 md:grid-cols-3">{[["Active Cards", cards.filter((card) => card.status === "Active")], ["Low Balance", cards.filter((card) => card.balance <= 50)], ["Inactive Cards", cards.filter((card) => card.status === "Inactive")]].map(([title, value]) => <div key={title} className="rounded-2xl border border-white/10 bg-[#111111] p-6"><p className="text-sm text-gray-500">{title}</p><p className="mt-3 text-3xl font-bold">{value.length}</p></div>)}</div><div className="rounded-2xl border border-white/10 bg-[#111111] p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search card, business, or customer..." className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm lg:max-w-md" /><div className="flex flex-wrap gap-2">{["All", "Active", "Low Balance", "Inactive"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-xl px-4 py-2 text-sm ${filter === item ? "bg-yellow-400 font-semibold text-black" : "bg-white/[0.03] text-gray-400"}`}>{item}</button>)}</div></div></div><div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]"><div className="overflow-x-auto"><table className="w-full min-w-[800px]"><thead className="border-b border-white/10"><tr className="text-left text-xs uppercase tracking-wider text-gray-600"><th className="px-6 py-4">Card ID</th><th className="px-6 py-4">Business</th><th className="px-6 py-4">Customer</th><th className="px-6 py-4">Balance</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Actions</th></tr></thead><tbody className="divide-y divide-white/5">{shown.map((card) => <tr key={card.id}><td className="px-6 py-5 font-semibold text-yellow-400">{card.id}</td><td className="px-6 py-5">{card.business}</td><td className="px-6 py-5 text-gray-400">{card.owner}</td><td className="px-6 py-5 font-semibold">₱{card.balance.toLocaleString()}</td><td className="px-6 py-5"><span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs text-yellow-400">{card.status}</span></td><td className="relative px-6 py-5"><button aria-label={`Actions for ${card.id}`} onClick={() => setModal(modal?.type === "menu" && modal.card.id === card.id ? null : { type: "menu", card })} className="text-xl text-gray-500">⋮</button>{modal?.type === "menu" && modal.card.id === card.id && <DropdownMenu options={options(card)} onSelect={(option) => { option.onClick(); if (option.label !== "View Details") setModal(null) }} />}</td></tr>)}</tbody></table></div>{shown.length === 0 && <div className="px-6 py-12 text-center text-gray-500">No NFC cards found.</div>}</div>{modal?.type === "register" && <Modal title="Register NFC Card" onClose={() => setModal(null)}><form onSubmit={saveCard} className="space-y-4"><input required placeholder="Business" value={form.business} onChange={(event) => setForm({ ...form, business: event.target.value })} className="field" /><input required placeholder="Customer / owner" value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} className="field" /><input min="0" type="number" placeholder="Opening balance" value={form.balance} onChange={(event) => setForm({ ...form, balance: event.target.value })} className="field" /><button className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black">Register Card</button></form></Modal>}{modal?.type === "balance" && <Modal title="Add Balance" onClose={() => setModal(null)}><form onSubmit={addBalance} className="space-y-4"><input required min="1" type="number" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="field" /><button className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black">Add Balance</button></form></Modal>}{modal?.type === "details" && <Modal title="Card Details" onClose={() => setModal(null)}><p className="text-lg font-semibold">{modal.card.id}</p><p className="mt-2 text-gray-400">{modal.card.owner} · ₱{modal.card.balance.toLocaleString()} · {modal.card.status}</p></Modal>}{confirm && <ConfirmModal title={`${confirm.status} card?`} description={`This will mark ${confirm.card.id} as ${confirm.status}.`} confirmLabel={confirm.status} destructive={confirm.status === "Inactive"} onConfirm={changeStatus} onClose={() => setConfirm(null)} />}{toast && <Toast message={toast} onClose={() => setToast("")} />}</div>
}

export default NFCCards
