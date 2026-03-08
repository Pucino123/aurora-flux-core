/**
 * InvoiceModal — two-column invoice generator with live preview
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Send, Loader2, Building2, User, Hash } from "lucide-react";
import { toast } from "sonner";
import { useCRM, CRMContact } from "@/context/CRMContext";
import { pushNotification } from "@/components/NotificationBell";

interface LineItem {
  id: string;
  description: string;
  qty: number;
  price: number;
}

interface Props {
  open: boolean;
  contact: CRMContact | null;
  onClose: () => void;
}

const newItem = (): LineItem => ({
  id: crypto.randomUUID(),
  description: "",
  qty: 1,
  price: 0,
});

const InvoiceModal = ({ open, contact, onClose }: Props) => {
  const { addInvoice } = useCRM();
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [invoiceNo, setInvoiceNo] = useState(() => `INV-${Date.now().toString().slice(-5)}`);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [sending, setSending] = useState(false);

  const total = items.reduce((s, it) => s + it.qty * it.price, 0);
  const tax = total * 0.2;
  const grandTotal = total + tax;

  const updateItem = useCallback((id: string, field: keyof LineItem, val: string | number) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: val } : it));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev);
  }, []);

  const handleSend = async () => {
    if (!contact) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 2000));
    addInvoice(contact.id, {
      id: invoiceNo,
      amount: grandTotal,
      date: new Date().toISOString().split("T")[0],
      status: "Sent",
      description: items.map(i => i.description).join(", ").slice(0, 80),
    });
    toast.success(`Invoice sent to ${contact.email || contact.name}`);
    setSending(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && contact && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-0 z-[9001] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
              style={{ background: "hsl(var(--card)/0.97)", backdropFilter: "blur(40px)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/20 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-foreground">Create Invoice</h2>
                  <p className="text-xs text-muted-foreground">Billing {contact.name}</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground">
                  <X size={16} />
                </button>
              </div>

              {/* Two-column body */}
              <div className="flex flex-1 overflow-hidden min-h-0">
                {/* LEFT: Editor */}
                <div className="flex-1 overflow-y-auto px-6 py-5 border-r border-border/20 space-y-5">
                  {/* Meta row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1.5 block">Invoice #</label>
                      <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
                        className="w-full bg-secondary/40 border border-border/30 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1.5 block">Due Date</label>
                      <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                        className="w-full bg-secondary/40 border border-border/30 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-all" />
                    </div>
                  </div>

                  {/* Billed to */}
                  <div className="p-3.5 rounded-2xl border border-border/20 bg-secondary/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-2">Billed To</p>
                    <p className="text-sm font-semibold text-foreground">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.email || "No email"}</p>
                    <p className="text-xs text-muted-foreground">{contact.company || ""}</p>
                  </div>

                  {/* Line items */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-foreground">Line Items</p>
                      <button onClick={() => setItems(p => [...p, newItem()])}
                        className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors">
                        <Plus size={12} /> Add Item
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_60px_80px_28px] gap-2 text-[10px] text-muted-foreground uppercase tracking-wide px-1">
                        <span>Description</span><span className="text-center">Qty</span><span className="text-right">Price</span><span />
                      </div>
                      {items.map(it => (
                        <div key={it.id} className="grid grid-cols-[1fr_60px_80px_28px] gap-2 items-center">
                          <input value={it.description} onChange={e => updateItem(it.id, "description", e.target.value)}
                            placeholder="Service or product…"
                            className="bg-secondary/40 border border-border/20 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/40 transition-all" />
                          <input type="number" min={1} value={it.qty} onChange={e => updateItem(it.id, "qty", Number(e.target.value))}
                            className="bg-secondary/40 border border-border/20 rounded-lg px-2 py-1.5 text-xs text-foreground outline-none text-center focus:border-primary/40 transition-all" />
                          <input type="number" min={0} step={0.01} value={it.price} onChange={e => updateItem(it.id, "price", Number(e.target.value))}
                            className="bg-secondary/40 border border-border/20 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none text-right focus:border-primary/40 transition-all" />
                          <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t border-border/20 pt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span><span>${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tax (20%)</span><span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-foreground">
                      <span>Total</span><span>${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Send button */}
                  <button onClick={handleSend} disabled={sending}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--aurora-violet)))" }}>
                    {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send Invoice to {contact.email || contact.name}</>}
                  </button>
                </div>

                {/* RIGHT: Live preview */}
                <div className="w-[400px] overflow-y-auto bg-white p-8 shrink-0 hidden lg:block">
                  {/* Invoice paper */}
                  <div className="text-gray-900 text-sm">
                    {/* Branding */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                          <Building2 size={14} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-base leading-none">Dashiii</p>
                          <p className="text-[10px] text-gray-400">Workspace Invoice</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xl text-gray-900">{invoiceNo}</p>
                        <p className="text-[11px] text-gray-400">Due {dueDate}</p>
                      </div>
                    </div>

                    {/* Parties */}
                    <div className="grid grid-cols-2 gap-4 mb-6 text-[11px]">
                      <div>
                        <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">From</p>
                        <p className="font-semibold text-gray-900">Your Company</p>
                        <p className="text-gray-500">billing@yourco.com</p>
                      </div>
                      <div>
                        <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Billed To</p>
                        <p className="font-semibold text-gray-900">{contact.name}</p>
                        <p className="text-gray-500">{contact.email || "—"}</p>
                        <p className="text-gray-500">{contact.company || ""}</p>
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="border-t border-gray-100 mb-4">
                      <div className="grid grid-cols-[1fr_40px_60px_70px] gap-2 py-2 text-[9px] text-gray-400 uppercase tracking-wide font-semibold border-b border-gray-100">
                        <span>Description</span><span className="text-center">Qty</span><span className="text-right">Price</span><span className="text-right">Total</span>
                      </div>
                      {items.map(it => (
                        <div key={it.id} className="grid grid-cols-[1fr_40px_60px_70px] gap-2 py-2 border-b border-gray-50 text-[11px]">
                          <span className="text-gray-800 truncate">{it.description || "—"}</span>
                          <span className="text-center text-gray-500">{it.qty}</span>
                          <span className="text-right text-gray-500">${it.price.toFixed(2)}</span>
                          <span className="text-right font-medium text-gray-800">${(it.qty * it.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="text-[11px] space-y-1 ml-auto w-44">
                      <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
                      <div className="flex justify-between text-gray-500"><span>Tax 20%</span><span>${tax.toFixed(2)}</span></div>
                      <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                        <span>Total Due</span><span>${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                      Thank you for your business. Payment due within 30 days.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default InvoiceModal;
