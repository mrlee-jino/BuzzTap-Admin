import { createContext, useContext, useMemo, useState } from "react"

const MAX_SUPPLY = 100000
const AdminDataContext = createContext(null)

const initialBusinesses = [
  { id: "BUS-001", name: "CyberHub Gaming Station", allocation: 20000, inventory: 5200, distributed: 6800, collected: 4100 },
  { id: "BUS-002", name: "Bean & Byte Cafe", allocation: 15000, inventory: 3500, distributed: 4500, collected: 2900 },
  { id: "BUS-003", name: "NextLevel Computer Shop", allocation: 12000, inventory: 2400, distributed: 3600, collected: 2100 },
]

const initialCustomers = [
  { id: "CUS-001", name: "Mara Santos", email: "mara@example.com", phone: "+63 917 555 0101", cardId: "NFC-00082", status: "ACTIVE", balance: 1240 },
  { id: "CUS-002", name: "Eli Navarro", email: "eli@example.com", phone: "+63 917 555 0102", cardId: "NFC-00091", status: "PENDING", balance: 480 },
  { id: "CUS-003", name: "Noah Reyes", email: "noah@example.com", phone: "+63 917 555 0103", cardId: "NFC-00104", status: "SUSPENDED", balance: 0 },
  { id: "CUS-004", name: "Ari Flores", email: "ari@example.com", phone: "+63 917 555 0104", cardId: "NFC-00112", status: "ACTIVE", balance: 860 },
]

const initialLedger = [
  { id: "LED-1003", type: "CUSTOMER_LOAD", amount: 1240, status: "COMPLETED", source: "Treasury", destination: "CUS-001", reason: "Welcome balance", reference: "LOAD-001", notes: "Mock prototype load", createdAt: "Aug 28, 2026 09:12" },
  { id: "LED-1002", type: "BUSINESS_PURCHASE", amount: 2400, status: "COMPLETED", source: "Treasury", destination: "BUS-003", reason: "Monthly inventory", reference: "PO-003", notes: "", createdAt: "Aug 27, 2026 14:30" },
  { id: "LED-1001", type: "SYSTEM_ISSUANCE", amount: 5000, status: "COMPLETED", source: "Treasury", destination: "Reserve", reason: "Pilot allocation", reference: "ISSUE-001", notes: "Approved mock issuance", createdAt: "Aug 26, 2026 11:05" },
]

const initialContent = [
  { id: "CNT-001", title: "Weekend double points", type: "PROMOTION", status: "PENDING", owner: "Marketing", updatedAt: "Aug 28, 2026" },
  { id: "CNT-002", title: "Platform maintenance window", type: "UPDATE", status: "APPROVED", owner: "Operations", updatedAt: "Aug 27, 2026" },
  { id: "CNT-003", title: "CyberHub tournament", type: "EVENT", status: "PUBLISHED", owner: "CyberHub", updatedAt: "Aug 25, 2026" },
  { id: "CNT-004", title: "Old summer banner", type: "ADVERTISEMENT", status: "REJECTED", owner: "Marketing", updatedAt: "Aug 20, 2026", rejectedReason: "Expired campaign" },
]

const initialAuditLogs = [
  { id: "AUD-001", time: "09:12 AM", date: "Aug 28, 2026", type: "Treasury", action: "Customer load recorded", description: "Mock customer load LED-1003 was completed.", actor: "Admin", target: "CUS-001", status: "Success" },
]

function nowLabel() {
  return new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function AdminDataProvider({ children }) {
  const [treasury, setTreasury] = useState({ issued: 50000, reserved: 5000, pendingSettlement: 2000 })
  const [businesses, setBusinesses] = useState(initialBusinesses)
  const [customers, setCustomers] = useState(initialCustomers)
  const [ledger, setLedger] = useState(initialLedger)
  const [settlementRequests, setSettlementRequests] = useState([
    { id: "SET-001", businessId: "BUS-001", businessName: "CyberHub Gaming Station", amount: 4100, status: "PENDING", requestedAt: "Aug 28, 2026" },
    { id: "SET-002", businessId: "BUS-002", businessName: "Bean & Byte Cafe", amount: 2900, status: "PENDING", requestedAt: "Aug 27, 2026" },
  ])
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs)
  const [contentItems, setContentItems] = useState(initialContent)

  const appendAudit = (event) => {
    setAuditLogs((current) => [{ id: `AUD-${Date.now()}`, time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), actor: "Admin", status: "Success", ...event }, ...current])
  }

  const addLedger = (entry) => setLedger((current) => [{ id: `LED-${Date.now()}`, createdAt: nowLabel(), status: "COMPLETED", ...entry }, ...current])
  const ensureSupply = (amount) => Number(amount) > 0 && treasury.issued + Number(amount) <= MAX_SUPPLY

  const issueBuzzPoints = ({ amount, reason, reference, notes }) => {
    const value = Number(amount)
    if (!ensureSupply(value)) return { ok: false, error: "Amount exceeds available maximum supply." }
    setTreasury((current) => ({ ...current, issued: current.issued + value, reserved: current.reserved + value }))
    addLedger({ type: "SYSTEM_ISSUANCE", amount: value, source: "Treasury", destination: "Reserve", reason, reference, notes })
    appendAudit({ type: "Treasury", action: "BuzzPoints issued", description: `${value.toLocaleString()} mock BuzzPoints issued to reserve.`, target: reference || "Treasury" })
    return { ok: true }
  }

  const loadCustomer = ({ customerId, amount, reason, reference, notes }) => {
    const value = Number(amount)
    const customer = customers.find((item) => item.id === customerId)
    if (!customer) return { ok: false, error: "Select a customer." }
    if (!ensureSupply(value)) return { ok: false, error: "Amount exceeds available maximum supply." }
    setTreasury((current) => ({ ...current, issued: current.issued + value }))
    setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, balance: item.balance + value } : item))
    addLedger({ type: "CUSTOMER_LOAD", amount: value, source: "Treasury", destination: customerId, reason, reference, notes })
    appendAudit({ type: "Treasury", action: "Customer load recorded", description: `${value.toLocaleString()} mock BuzzPoints loaded to ${customerId}.`, target: customerId })
    return { ok: true }
  }

  const purchaseBusiness = ({ businessId, amount, reason }) => {
    const value = Number(amount)
    const business = businesses.find((item) => item.id === businessId)
    if (!business) return { ok: false, error: "Select a business." }
    if (!ensureSupply(value)) return { ok: false, error: "Amount exceeds available maximum supply." }
    if (business.inventory + value > business.allocation) return { ok: false, error: "Purchase exceeds the business allocation." }
    setTreasury((current) => ({ ...current, issued: current.issued + value }))
    setBusinesses((current) => current.map((item) => item.id === businessId ? { ...item, inventory: item.inventory + value } : item))
    addLedger({ type: "BUSINESS_PURCHASE", amount: value, source: "Treasury", destination: businessId, reason, reference: `PO-${businessId}`, notes: "" })
    appendAudit({ type: "Treasury", action: "Business purchase recorded", description: `${value.toLocaleString()} mock BuzzPoints allocated to ${business.name}.`, target: businessId })
    return { ok: true }
  }

  const distributeBusinessPoints = ({ businessId, customerId, amount }) => {
    const value = Number(amount)
    const business = businesses.find((item) => item.id === businessId)
    if (!business || business.inventory < value) return { ok: false, error: "Distribution exceeds business inventory." }
    setBusinesses((current) => current.map((item) => item.id === businessId ? { ...item, inventory: item.inventory - value, distributed: item.distributed + value } : item))
    setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, balance: item.balance + value } : item))
    addLedger({ type: "CUSTOMER_LOAD", amount: value, source: businessId, destination: customerId, reason: "Business distribution", reference: `DIST-${Date.now()}`, notes: "" })
    return { ok: true }
  }

  const updateCustomerStatus = (customerId, status) => {
    setCustomers((current) => current.map((item) => item.id === customerId ? { ...item, status } : item))
    appendAudit({ type: "User", action: `Customer ${status.toLowerCase()}`, description: `Customer status changed to ${status}.`, target: customerId })
  }

  const updateSettlement = (requestId, status) => {
    setSettlementRequests((current) => current.map((item) => item.id === requestId ? { ...item, status } : item))
    const request = settlementRequests.find((item) => item.id === requestId)
    if (request && ["APPROVED", "REJECTED"].includes(status)) setTreasury((current) => ({ ...current, pendingSettlement: Math.max(0, current.pendingSettlement - request.amount) }))
    appendAudit({ type: "Settlement", action: `Settlement ${status.toLowerCase()}`, description: `Settlement request ${requestId} was ${status.toLowerCase()}.`, target: requestId, status: status === "REJECTED" ? "Warning" : "Success" })
  }

  const requestSettlementInformation = (requestId) => {
    setSettlementRequests((current) => current.map((item) => item.id === requestId ? { ...item, status: "INFO_REQUESTED" } : item))
    appendAudit({ type: "Settlement", action: "Settlement information requested", description: `Additional information was requested for ${requestId}.`, target: requestId, status: "Warning" })
  }

  const updateContent = (contentId, status, rejectedReason = "") => {
    setContentItems((current) => current.map((item) => item.id === contentId ? { ...item, status, rejectedReason } : item))
    appendAudit({ type: "Content", action: `Content ${status.toLowerCase()}`, description: `Content item ${contentId} was ${status.toLowerCase()}.`, target: contentId, status: status === "REJECTED" ? "Warning" : "Success" })
  }

  const metrics = useMemo(() => {
    const businessHoldings = businesses.reduce((total, item) => total + item.inventory, 0)
    const customerHoldings = customers.reduce((total, item) => total + item.balance, 0)
    const circulation = businessHoldings + customerHoldings
    const mismatch = treasury.issued - (businessHoldings + customerHoldings + treasury.reserved + treasury.pendingSettlement)
    return { available: MAX_SUPPLY - treasury.issued, circulation, businessHoldings, customerHoldings, mismatch }
  }, [businesses, customers, treasury])

  const value = { MAX_SUPPLY, treasury, businesses, customers, ledger, settlementRequests, auditLogs, contentItems, metrics, appendAudit, issueBuzzPoints, loadCustomer, purchaseBusiness, distributeBusinessPoints, updateCustomerStatus, updateSettlement, requestSettlementInformation, updateContent }
  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
}

function useAdminData() {
  const context = useContext(AdminDataContext)
  if (!context) throw new Error("useAdminData must be used inside AdminDataProvider")
  return context
}

// The provider and hook intentionally share this small prototype module.
// eslint-disable-next-line react-refresh/only-export-components
export { AdminDataProvider, useAdminData }
