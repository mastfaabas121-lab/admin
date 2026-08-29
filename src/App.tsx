import { useEffect, useMemo, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageCircle,
  HandCoins,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  ShoppingBasket,
  ShoppingCart,
  ReceiptText,
  TrendingUp,
  Trash2,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type TabId = "inventory" | "customers" | "overdue" | "pos" | "stats";
type Icon = typeof Box;
type Product = { id: string; name: string; category: string; sku: string; stock: number; price: number; buy: number };
type Customer = { id: Id<"customers">; name: string; phone: string; reminderDays: number; debt: number; paid: number; next: string; status: string };
type OverdueAccount = { id: string; name: string; phone: string; amount: number; dueDate: number; overdueDays: number };

const tabs: { id: TabId; label: string; icon: Icon }[] = [
  { id: "inventory", label: "المخزون", icon: Box },
  { id: "customers", label: "الزبائن", icon: Users },
  { id: "overdue", label: "المتأخرون", icon: Clock3 },
  { id: "pos", label: "البيع المباشر", icon: ShoppingCart },
  { id: "stats", label: "الإحصائيات", icon: BarChart3 },
];

const GREGORIAN_LOCALE = "ar-IQ-u-ca-gregory";
const money = (value: number) => `${new Intl.NumberFormat("ar-IQ").format(value)} د.ع`;
const receiptHeaderUrl = `${import.meta.env.BASE_URL}receipt-header.png`;

function App() {
  const convexProducts = useQuery(api.products.list);
  const convexCustomers = useQuery(api.customers.list);
  const convexOverdue = useQuery(api.debts.overdue);
  const [activeTab, setActiveTab] = useState<TabId>("inventory");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});

  const productRows: Product[] = convexProducts?.length
    ? convexProducts.map((product) => ({
        id: product._id,
        name: product.name,
        category: product.category,
        sku: product.sku,
        stock: product.stock,
        price: product.salePrice,
        buy: product.purchasePrice,
      }))
    : [];
  const customerRows: Customer[] = convexCustomers?.length
    ? convexCustomers.map((customer) => ({
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        reminderDays: (customer as typeof customer & { reminderDays?: number }).reminderDays ?? 30,
        debt: customer.totalDebt ?? 0,
        paid: 0,
        next: customer.nextDueDate ? new Intl.DateTimeFormat(GREGORIAN_LOCALE).format(customer.nextDueDate) : "—",
        status: !customer.active ? "موقوف" : customer.isOverdue ? "متأخر" : (customer.totalDebt ?? 0) > 0 ? "منتظم" : "مكتمل",
      }))
    : [];
  const convexConnected = convexProducts !== undefined && convexCustomers !== undefined;
  const overdueRows: OverdueAccount[] = (convexOverdue ?? []).map((debt) => ({
    id: debt._id,
    name: debt.customerName,
    phone: debt.customerPhone,
    amount: debt.remainingAmount,
    dueDate: debt.nextDueDate,
    overdueDays: (debt as typeof debt & { overdueDays?: number }).overdueDays
      ?? Math.max(1, Math.floor((Date.now() - debt.nextDueDate) / 86_400_000)),
  }));

  const current = tabs.find((tab) => tab.id === activeTab)!;
  const filteredProducts = productRows.filter((product) =>
    `${product.name} ${product.category} ${product.sku}`.includes(query.trim()),
  );
  const filteredCustomers = customerRows.filter((customer) =>
    `${customer.name} ${customer.phone}`.includes(query.trim()),
  );
  const cartLines = productRows.filter((product) => cart[product.id]);
  const cartTotal = useMemo(
    () => cartLines.reduce((sum, product) => sum + product.price * cart[product.id], 0),
    [cart, cartLines],
  );

  const changeTab = (tab: TabId) => {
    setActiveTab(tab);
    setQuery("");
    setSidebarOpen(false);
    setNotificationOpen(false);
  };

  const changeQuantity = (id: string, delta: number) => {
    setCart((currentCart) => {
      const product = productRows.find((row) => row.id === id);
      const next = Math.max(0, Math.min(product?.stock ?? 0, (currentCart[id] || 0) + delta));
      if (!next) {
        const { [id]: _, ...rest } = currentCart;
        return rest;
      }
      return { ...currentCart, [id]: next };
    });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><WalletCards size={24} /></div>
          <div><strong>دَين</strong><span>إدارة ذكية لمتجرك</span></div>
          <button className="icon-button close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة"><X /></button>
        </div>

        <div className="environment-pill"><span className={`live-dot ${convexConnected ? "" : "connecting"}`} /> {convexConnected ? "متصل ببيئة الإنتاج" : "جارٍ الاتصال"} <b>Production</b></div>

        <nav className="main-nav" aria-label="التبويبات الرئيسية">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => changeTab(tab.id)}>
                <TabIcon size={20} />
                <span>{tab.label}</span>
                {tab.id === "overdue" && overdueRows.length > 0 && <small>{overdueRows.length}</small>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <div className="sidebar-card-icon"><TrendingUp size={20} /></div>
          <strong>أداء هذا الشهر</strong>
          <span>ارتفعت التحصيلات بنسبة 18%</span>
          <div className="mini-progress"><i /></div>
        </div>
        <div className="user-card"><div className="avatar">م</div><div><strong>مصطفى</strong><span>مدير النظام</span></div><ChevronLeft size={18} /></div>
      </aside>

      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة" />}

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><WalletCards size={21} /></div>
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="فتح القائمة"><Menu /></button>
          <div className="page-heading"><span>لوحة الإدارة / {current.label}</span><h1>{current.label}</h1></div>
          <div className="topbar-actions">
            <div className="date-chip"><span>{new Intl.DateTimeFormat(GREGORIAN_LOCALE, { weekday: "long" }).format(Date.now())}</span><strong>{new Intl.DateTimeFormat(GREGORIAN_LOCALE, { year: "numeric", month: "long", day: "numeric" }).format(Date.now())}</strong></div>
            <button className={`icon-button notification ${notificationOpen ? "active" : ""}`} aria-label={`الإشعارات${overdueRows.length ? `، ${overdueRows.length} متأخر` : ""}`} aria-expanded={notificationOpen} onClick={() => setNotificationOpen((open) => !open)}><Bell />{overdueRows.length > 0 && <span className="notification-count">{overdueRows.length > 99 ? "99+" : overdueRows.length}</span>}</button>
          </div>
          {notificationOpen && <div className="notification-panel" role="dialog" aria-label="إشعارات المتأخرين">
            <div className="notification-panel-head"><div><strong>المتأخرون</strong><span>{overdueRows.length ? `${overdueRows.length} حساب يحتاج تذكيراً` : "لا توجد حسابات متأخرة"}</span></div><button onClick={() => setNotificationOpen(false)} aria-label="إغلاق الإشعارات"><X size={17} /></button></div>
            {overdueRows.length ? <div className="notification-list">{overdueRows.map((account) => <button key={account.id} onClick={() => changeTab("overdue")}><span className="notification-avatar">{account.name.charAt(0)}</span><span className="notification-person"><strong>{account.name}</strong><small>متأخر {account.overdueDays} يوم · {money(account.amount)}</small></span><ChevronLeft size={17} /></button>)}</div> : <div className="notification-empty"><CheckCircle2 size={25} /><span>كل الحسابات منتظمة حالياً</span></div>}
          </div>}
        </header>

        {activeTab === "inventory" && <InventoryView products={filteredProducts} query={query} setQuery={setQuery} />}
        {activeTab === "customers" && <CustomersView customers={filteredCustomers} products={productRows} query={query} setQuery={setQuery} />}
        {activeTab === "overdue" && <OverdueView accounts={overdueRows} />}
        {activeTab === "pos" && <PosView productsData={productRows} cart={cart} cartLines={cartLines} total={cartTotal} query={query} setQuery={setQuery} changeQuantity={changeQuantity} clearCart={() => setCart({})} />}
        {activeTab === "stats" && <StatsView products={productRows} />}
      </main>

      <nav className="mobile-nav" aria-label="تنقل الهاتف">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => changeTab(tab.id)}><TabIcon size={20} /><span>{tab.label === "البيع المباشر" ? "البيع" : tab.label}</span></button>;
        })}
      </nav>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="search-box"><Search size={19} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function MetricCard({ icon: CardIcon, tone, label, value, foot }: { icon: Icon; tone: string; label: string; value: string; foot: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}><CardIcon size={22} /></div><span>{label}</span><strong>{value}</strong><small>{foot}</small></article>;
}

function EmptyState({ icon: EmptyIcon, title, text }: { icon: Icon; title: string; text: string }) {
  return <div className="empty-state"><span><EmptyIcon size={28} /></span><strong>{title}</strong><p>{text}</p></div>;
}

function InventoryView({ products: visible, query, setQuery }: { products: Product[]; query: string; setQuery: (value: string) => void }) {
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const removeProduct = useMutation(api.products.remove);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", purchasePrice: "", salePrice: "", stock: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingProduct(null);
    setFormError("");
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setForm({ name: "", purchasePrice: "", salePrice: "", stock: "" });
    setFormError("");
    setFormOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setForm({ name: product.name, purchasePrice: String(product.buy), salePrice: String(product.price), stock: String(product.stock) });
    setFormError("");
    setFormOpen(true);
  };

  const submitProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    const purchasePrice = Number(form.purchasePrice);
    const salePrice = Number(form.salePrice);
    const stock = Number(form.stock);

    if (!name) return setFormError("اكتب اسم المادة.");
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) return setFormError("سعر الشراء غير صحيح.");
    if (!Number.isFinite(salePrice) || salePrice < 0) return setFormError("سعر البيع غير صحيح.");
    if (!Number.isInteger(stock) || stock < 0) return setFormError("الكمية يجب أن تكون رقماً صحيحاً.");

    setSaving(true);
    setFormError("");
    try {
      if (editingProduct) {
        await updateProduct({ productId: editingProduct.id as Id<"products">, name, stock, salePrice, purchasePrice });
      } else {
        await createProduct({ name, category: "عام", sku: `ITEM-${Date.now()}`, stock, salePrice, purchasePrice, lowStockAt: 3 });
      }
      setForm({ name: "", purchasePrice: "", salePrice: "", stock: "" });
      setFormOpen(false);
      setEditingProduct(null);
    } catch {
      setFormError("تعذر حفظ المنتج. تحقق من الاتصال وحاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="view-stack">
    <div className="metrics-grid">
      <MetricCard icon={Box} tone="green" label="إجمالي المنتجات" value={String(visible.length)} foot="منتج مسجل" />
      <MetricCard icon={CircleDollarSign} tone="gold" label="قيمة المخزون" value={money(visible.reduce((sum, product) => sum + product.buy * product.stock, 0))} foot="بسعر الشراء" />
      <MetricCard icon={AlertTriangle} tone="red" label="مخزون منخفض" value={String(visible.filter((product) => product.stock <= 3).length)} foot="تحتاج إعادة تجهيز" />
      <MetricCard icon={PackagePlus} tone="blue" label="نتائج البحث" value={String(visible.length)} foot="حسب التصفية الحالية" />
    </div>
    <div className="panel">
      <div className="panel-header"><div><h2>قائمة المخزون</h2><p>تابع كميات المنتجات وأسعار البيع.</p></div><div className="panel-actions"><SearchBox value={query} onChange={setQuery} placeholder="ابحث عن منتج..." /><button className="primary-button" onClick={openAddProduct}><Plus size={18} /> إضافة منتج</button></div></div>
      <div className="data-table-wrap">{visible.length ? <table className="data-table"><thead><tr><th>المنتج</th><th>الكمية</th><th>سعر البيع</th><th>الإجراءات</th></tr></thead><tbody>{visible.map((product) => <tr key={product.id}><td data-label="المنتج"><div className="product-name"><span className="product-thumb"><ShoppingBasket size={19} /></span><strong>{product.name}</strong></div></td><td data-label="الكمية"><b>{product.stock}</b> قطعة</td><td data-label="سعر البيع"><strong>{money(product.price)}</strong></td><td className="inventory-actions-cell" data-label="الإجراءات"><div className="record-action-buttons"><button type="button" className="edit-record-button" onClick={() => openEditProduct(product)} aria-label={`تعديل ${product.name}`}><Pencil size={16} /> تعديل</button><button type="button" className="delete-record-button" onClick={() => setDeletingProduct(product)} aria-label={`حذف ${product.name}`}><Trash2 size={16} /> حذف</button></div></td></tr>)}</tbody></table> : <EmptyState icon={Box} title="المخزون فارغ" text="أضف أول منتج لبدء إدارة المخزون." />}</div>
    </div>
    {formOpen && <div className="sheet-backdrop" onMouseDown={closeForm}>
      <form className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="product-form-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={submitProduct}>
        <div className="sheet-handle" />
        <div className="sheet-header"><div><h2 id="product-form-title">{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</h2><p>{editingProduct ? "عدّل معلومات المادة ثم احفظ." : "أدخل معلومات المادة في المخزون."}</p></div><button type="button" className="sheet-close" onClick={closeForm} aria-label="إغلاق"><X size={20} /></button></div>
        <label className="form-field"><span>اسم المادة</span><input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="مثال: مادة غذائية" /></label>
        <div className="form-grid">
          <label className="form-field"><span>سعر الشراء</span><div className="money-input"><input inputMode="numeric" type="number" min="0" step="1" value={form.purchasePrice} onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })} placeholder="0" /><b>د.ع</b></div></label>
          <label className="form-field"><span>سعر البيع</span><div className="money-input"><input inputMode="numeric" type="number" min="0" step="1" value={form.salePrice} onChange={(event) => setForm({ ...form, salePrice: event.target.value })} placeholder="0" /><b>د.ع</b></div></label>
        </div>
        <label className="form-field"><span>الكمية</span><input inputMode="numeric" type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} placeholder="0" /></label>
        {formError && <div className="form-error"><AlertTriangle size={16} />{formError}</div>}
        <button className="save-product-button" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : editingProduct ? "حفظ التعديل" : "حفظ المنتج"}</button>
      </form>
    </div>}
    {deletingProduct && <div className="sheet-backdrop" onMouseDown={() => setDeletingProduct(null)}><div className="bottom-sheet delete-confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="delete-product-title" onMouseDown={(event) => event.stopPropagation()}><div className="sheet-handle" /><span className="delete-confirm-icon"><Trash2 size={24} /></span><h2 id="delete-product-title">حذف {deletingProduct.name}؟</h2><p>سيختفي المنتج من المخزون ولن يظهر في البيع.</p><div className="delete-confirm-actions"><button onClick={() => setDeletingProduct(null)}>إلغاء</button><button className="confirm-delete" onClick={async () => { try { await removeProduct({ productId: deletingProduct.id as Id<"products"> }); setDeletingProduct(null); } catch { setDeletingProduct(null); } }}>حذف المنتج</button></div></div></div>}
  </section>;
}

function CustomersView({ customers: visible, products, query, setQuery }: { customers: Customer[]; products: Product[]; query: string; setQuery: (value: string) => void }) {
  const createCustomer = useMutation(api.customers.create);
  const updateCustomer = useMutation(api.customers.update);
  const removeCustomer = useMutation(api.customers.remove);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleteCustomerError, setDeleteCustomerError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", reminderDays: "30" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingCustomer(null);
    setFormError("");
  };

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setForm({ name: "", phone: "", reminderDays: "30" });
    setFormError("");
    setFormOpen(true);
  };

  const openEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({ name: customer.name, phone: customer.phone, reminderDays: String(customer.reminderDays) });
    setFormError("");
    setFormOpen(true);
  };

  const submitCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const phoneDigits = phone.replace(/\D/g, "");
    const reminderDays = Number(form.reminderDays);

    if (!name) return setFormError("اكتب اسم الزبون.");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) return setFormError("اكتب رقم واتساب صحيحاً.");
    if (!Number.isInteger(reminderDays) || reminderDays < 1 || reminderDays > 365) return setFormError("عدد أيام التذكير يجب أن يكون بين 1 و365 يوماً.");

    setSaving(true);
    setFormError("");
    try {
      if (editingCustomer) {
        await updateCustomer({ customerId: editingCustomer.id, name, phone, reminderDays });
      } else {
        const customerId = await createCustomer({ name, phone, reminderDays });
        setSelectedCustomer({ id: customerId, name, phone, reminderDays, debt: 0, paid: 0, next: "—", status: "مكتمل" });
      }
      setForm({ name: "", phone: "", reminderDays: "30" });
      setFormOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      const message = error instanceof Error && error.message.includes("مسجل مسبقاً")
        ? "رقم الواتساب مسجل لزبون آخر."
        : "تعذر حفظ الزبون. تحقق من الاتصال وحاول مرة أخرى.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  if (selectedCustomer) {
    return <CustomerAccountView customer={selectedCustomer} products={products} onBack={() => setSelectedCustomer(null)} />;
  }

  return <section className="view-stack">
    <div className="metrics-grid three">
      <MetricCard icon={Users} tone="green" label="عدد الزبائن" value={String(visible.length)} foot="زبون مسجل" />
      <MetricCard icon={CreditCard} tone="gold" label="إجمالي الديون" value={money(visible.reduce((sum, customer) => sum + customer.debt, 0))} foot="الحسابات الحالية" />
      <MetricCard icon={CheckCircle2} tone="blue" label="المُحصّل هذا الشهر" value={money(0)} foot="لا توجد دفعات بعد" />
    </div>
    <div className="panel">
      <div className="panel-header"><div><h2>سجل الزبائن</h2><p>تفاصيل الحساب والأقساط القادمة.</p></div><div className="panel-actions"><SearchBox value={query} onChange={setQuery} placeholder="اسم الزبون أو رقم الواتساب..." /><button className="primary-button" onClick={openAddCustomer}><UserPlus size={18} /> زبون جديد</button></div></div>
      <div className="customer-list">{visible.length ? visible.map((customer, index) => <article className="customer-row customer-card-clickable" role="button" tabIndex={0} key={customer.id} onClick={() => setSelectedCustomer(customer)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedCustomer(customer); }}><div className={`avatar avatar-${index % 4}`}>{customer.name.charAt(0)}</div><div className="customer-main"><strong>{customer.name}</strong><span>{customer.phone}</span><small className="reminder-cycle"><Clock3 size={14} /> تذكير بعد {customer.reminderDays} يوم</small></div><div><small>المبلغ المتبقي</small><strong className={customer.debt ? "debt-value" : "paid-value"}>{customer.debt ? money(customer.debt) : "لا يوجد دين"}</strong></div><div><small>القسط القادم</small><strong>{customer.next}</strong></div><span className={`status ${customer.status === "متأخر" ? "danger" : customer.status === "مكتمل" ? "success" : "info"}`}>{customer.status}</span><div className="customer-row-actions"><button type="button" className="icon-edit-button" onClick={(event) => { event.stopPropagation(); openEditCustomer(customer); }} aria-label={`تعديل ${customer.name}`}><Pencil size={16} /></button><button type="button" className="icon-delete-button" onClick={(event) => { event.stopPropagation(); setDeleteCustomerError(""); setDeletingCustomer(customer); }} aria-label={`حذف ${customer.name}`}><Trash2 size={16} /></button></div><button className="ghost-button" onClick={(event) => { event.stopPropagation(); setSelectedCustomer(customer); }}>فتح الحساب <ChevronLeft size={16} /></button></article>) : <EmptyState icon={Users} title="لا يوجد زبائن" text="أضف أول زبون لفتح حساب جديد." />}</div>
    </div>
    {formOpen && <div className="sheet-backdrop" onMouseDown={closeForm}>
      <form className="bottom-sheet customer-sheet" role="dialog" aria-modal="true" aria-labelledby="customer-form-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={submitCustomer}>
        <div className="sheet-handle" />
        <div className="sheet-header"><div><h2 id="customer-form-title">{editingCustomer ? "تعديل الزبون" : "إضافة زبون جديد"}</h2><p>{editingCustomer ? "عدّل بيانات الزبون ثم احفظ." : "سجّل الاسم ورقم الواتساب للتواصل والتذكير."}</p></div><button type="button" className="sheet-close" onClick={closeForm} aria-label="إغلاق"><X size={20} /></button></div>
        <label className="form-field"><span>اسم الزبون</span><input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="أدخل الاسم" /></label>
        <label className="form-field"><span>رقم الواتساب</span><input inputMode="tel" type="tel" dir="ltr" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="07XX XXX XXXX" /></label>
        <label className="form-field"><span>التذكير بعد عدد أيام</span><div className="days-input"><input inputMode="numeric" type="number" min="1" max="365" step="1" value={form.reminderDays} onChange={(event) => setForm({ ...form, reminderDays: event.target.value })} /><b>يوم</b></div></label>
        <div className="phone-hint"><MessageCircle size={15} /><span>سيُستخدم الرقم لإرسال تذكيرات الأقساط عبر واتساب.</span></div>
        {formError && <div className="form-error"><AlertTriangle size={16} />{formError}</div>}
        <button className="save-product-button" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : editingCustomer ? "حفظ التعديل" : "حفظ الزبون"}</button>
      </form>
    </div>}
    {deletingCustomer && <div className="sheet-backdrop" onMouseDown={() => setDeletingCustomer(null)}><div className="bottom-sheet delete-confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="delete-customer-title" onMouseDown={(event) => event.stopPropagation()}><div className="sheet-handle" /><span className="delete-confirm-icon"><Trash2 size={24} /></span><h2 id="delete-customer-title">حذف {deletingCustomer.name}؟</h2><p>لا يمكن حذف الزبون إذا كان عليه دين قائم.</p>{deleteCustomerError && <div className="form-error"><AlertTriangle size={16} />{deleteCustomerError}</div>}<div className="delete-confirm-actions"><button onClick={() => setDeletingCustomer(null)}>إلغاء</button><button className="confirm-delete" onClick={async () => { try { await removeCustomer({ customerId: deletingCustomer.id }); setDeletingCustomer(null); } catch (error) { setDeleteCustomerError(error instanceof Error && error.message.includes("دين قائم") ? "لا يمكن حذف هذا الزبون لأن عليه ديناً قائماً." : "تعذر حذف الزبون. وظائف Convex الجديدة تحتاج إلى النشر أولاً."); } }}>حذف الزبون</button></div></div></div>}
  </section>;
}

type CustomerTransaction = { id: string; kind: "debt" | "payment" | "sale"; title: string; amount: number; date: number; dueDate?: number; paidAmount?: number; remainingAmount?: number };
type CustomerAccountData = { customer: { name: string; phone: string }; totalDebt: number; transactions: CustomerTransaction[] };

function TransactionReceipt({ customer, transaction, currentDebt, onClose }: { customer: { name: string; phone: string }; transaction: CustomerTransaction; currentDebt: number; onClose: () => void }) {
  const dateTimeFormat = new Intl.DateTimeFormat(GREGORIAN_LOCALE, { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  const printedAt = dateTimeFormat.format(Date.now());
  const transactionAt = dateTimeFormat.format(transaction.date);
  const receiptNumber = transaction.id.slice(-8).toUpperCase();
  const paid = transaction.kind === "payment" ? transaction.amount : transaction.paidAmount ?? 0;
  const remaining = transaction.kind === "sale" ? transaction.remainingAmount ?? 0 : transaction.kind === "payment" ? currentDebt : transaction.remainingAmount ?? currentDebt;
  const receiptTitle = transaction.kind === "payment" ? "وصل تسديد" : transaction.kind === "sale" ? "وصل بيع" : "وصل دين";

  return <div className="receipt-print-layer" role="dialog" aria-modal="true" aria-labelledby="receipt-title" onMouseDown={onClose}>
    <div className="receipt-dialog" onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" className="receipt-close" onClick={onClose} aria-label="إغلاق الوصل"><X size={20} /></button>
      <article className="receipt-paper">
        <header className="receipt-image-header"><img src={receiptHeaderUrl} alt="جمعية البيت الأبيض للأثاث" /></header>
        <div className="receipt-contact"><span dir="ltr">0781 324 9709</span><i /><span dir="ltr">0775 888 7900</span></div>
        <div className="receipt-title-row"><div><span id="receipt-title">{receiptTitle}</span><small>رقم الوصل: {receiptNumber}</small></div><b>{transaction.title}</b></div>
        <dl className="receipt-details">
          <div><dt>اسم الزبون</dt><dd>{customer.name}</dd></div>
          <div><dt>رقم الهاتف</dt><dd dir="ltr">{customer.phone || "—"}</dd></div>
          <div><dt>تاريخ المعاملة</dt><dd>{transactionAt}</dd></div>
          <div><dt>تاريخ ووقت الطباعة</dt><dd>{printedAt}</dd></div>
        </dl>
        <div className="receipt-amounts">
          <div><span>{transaction.kind === "payment" ? "مبلغ التسديد" : "مبلغ المعاملة"}</span><strong>{money(transaction.amount)}</strong></div>
          {(transaction.kind === "payment" || transaction.kind === "sale") && <div className="receipt-paid"><span>المبلغ المسدد</span><strong>{money(paid)}</strong></div>}
          <div className="receipt-remaining"><span>{transaction.kind === "sale" ? "المتبقي من المعاملة" : "الدين المتبقي حالياً"}</span><strong>{money(remaining)}</strong></div>
          {transaction.kind === "sale" && <div><span>الدين الكلي الحالي</span><strong>{money(currentDebt)}</strong></div>}
        </div>
        {transaction.dueDate && <div className="receipt-due"><span>تاريخ الاستحقاق</span><strong>{new Intl.DateTimeFormat(GREGORIAN_LOCALE, { year: "numeric", month: "long", day: "numeric" }).format(transaction.dueDate)}</strong></div>}
        <footer className="receipt-footer"><strong>شكراً لتعاملكم معنا</strong><span>التوقيع والختم</span></footer>
      </article>
      <div className="receipt-preview-actions"><button type="button" onClick={onClose}>إلغاء</button><button type="button" className="print-receipt-now" onClick={() => window.print()}><ReceiptText size={18} /> طباعة الوصل</button></div>
    </div>
  </div>;
}

function CustomerAccountView({ customer, products, onBack }: { customer: Customer; products: Product[]; onBack: () => void }) {
  const convex = useConvex();
  const createCustomerSale = useMutation(api.sales.createCustomerSale);
  const recordCustomerPayment = useMutation(api.debts.recordCustomerPayment);
  const [account, setAccount] = useState<CustomerAccountData>({ customer, totalDebt: customer.debt, transactions: [] });
  const [action, setAction] = useState<"sale" | "payment" | null>(null);
  const [amount, setAmount] = useState("");
  const [saleSearch, setSaleSearch] = useState("");
  const [saleCart, setSaleCart] = useState<Record<string, number>>({});
  const [paidAmount, setPaidAmount] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [printTransaction, setPrintTransaction] = useState<CustomerTransaction | null>(null);
  const saleProducts = saleSearch.trim()
    ? products.filter((product) => product.name.includes(saleSearch.trim()) && !saleCart[product.id]).slice(0, 8)
    : [];
  const saleLines = products.filter((product) => saleCart[product.id]);
  const saleTotal = saleLines.reduce((sum, product) => sum + product.price * saleCart[product.id], 0);
  const numericPaidAmount = paidAmount === "" ? 0 : Number(paidAmount);
  const saleRemaining = Math.max(0, saleTotal - (Number.isFinite(numericPaidAmount) ? numericPaidAmount : 0));

  const refreshAccount = async () => {
    try {
      const freshAccount = await convex.query(api.customers.account, { customerId: customer.id });
      if (freshAccount) setAccount(freshAccount);
    } catch {
      // تبقى المعاينة على بيانات القائمة إلى أن تُنشر وظائف Convex الجديدة.
    }
  };

  useEffect(() => {
    void refreshAccount();
  }, [customer.id]);

  const closeAction = () => {
    if (savingAction) return;
    setAction(null);
    setAmount("");
    setSaleSearch("");
    setSaleCart({});
    setPaidAmount("");
    setActionError("");
  };

  const changeSaleQuantity = (product: Product, delta: number) => {
    setSaleCart((current) => {
      const nextQuantity = Math.max(0, Math.min(product.stock, (current[product.id] || 0) + delta));
      if (!nextQuantity) {
        const { [product.id]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [product.id]: nextQuantity };
    });
  };

  const addSaleProduct = (product: Product) => {
    if (product.stock <= 0) return;
    setSaleCart((current) => ({ ...current, [product.id]: current[product.id] || 1 }));
    setSaleSearch("");
    setActionError("");
  };

  const submitAccountAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (action === "payment" && (!Number.isFinite(numericAmount) || numericAmount <= 0)) return setActionError("اكتب مبلغاً صحيحاً.");
    if (action === "payment" && numericAmount > account.totalDebt) return setActionError("مبلغ التسديد أكبر من الدين الكلي.");
    if (action === "sale" && !saleLines.length) return setActionError("أضف مادة واحدة على الأقل.");
    if (action === "sale" && (!Number.isFinite(numericPaidAmount) || numericPaidAmount < 0 || numericPaidAmount > saleTotal)) return setActionError("المبلغ المدفوع يجب ألا يتجاوز المجموع.");

    setSavingAction(true);
    setActionError("");
    try {
      if (action === "sale") {
        await createCustomerSale({
          customerId: customer.id,
          paidAmount: numericPaidAmount,
          items: saleLines.map((product) => ({ productId: product.id as Id<"products">, quantity: saleCart[product.id] })),
        });
      } else {
        await recordCustomerPayment({ customerId: customer.id, amount: numericAmount });
      }
      await refreshAccount();
      setAction(null);
      setAmount("");
      setSaleSearch("");
      setSaleCart({});
      setPaidAmount("");
    } catch (error) {
      setActionError(error instanceof Error && error.message.includes("أكبر من الدين") ? "مبلغ التسديد أكبر من الدين الكلي." : "تعذر حفظ المعاملة. حاول مرة أخرى.");
    } finally {
      setSavingAction(false);
    }
  };

  return <section className="view-stack customer-account-view">
    <button className="account-back" onClick={onBack}><ArrowRight size={19} /> رجوع إلى الزبائن</button>
    <article className="account-profile-card">
      <div className="account-profile-top"><div className="avatar account-avatar">{account.customer.name.charAt(0)}</div><div><h2>{account.customer.name}</h2><span>{account.customer.phone}</span></div></div>
      <div className="account-debt-summary"><span>الدين الكلي</span><strong>{money(account.totalDebt)}</strong><small>{account.totalDebt > 0 ? "المبلغ المتبقي في الحساب" : "لا يوجد دين على الزبون"}</small></div>
      <div className="account-main-actions">
        <button className="payment-action" disabled={account.totalDebt <= 0} onClick={() => setAction("payment")}><HandCoins size={20} /><span>تسديد</span></button>
        <button className="sale-action" onClick={() => setAction("sale")}><ShoppingCart size={20} /><span>بيع</span></button>
      </div>
    </article>

    <div className="panel transactions-panel">
      <div className="transactions-heading"><div><h2>المعاملات</h2><p>جميع عمليات البيع والتسديد.</p></div><span>{account.transactions.length}</span></div>
      {account.transactions.length ? <div className="transactions-list">{account.transactions.map((transaction) => {
        const shareUrl = whatsappTransactionUrl(account.customer.name, account.customer.phone, transaction, account.totalDebt);
        return <article className="transaction-row" key={`${transaction.kind}-${transaction.id}`}>
          <div className={`transaction-icon ${transaction.kind}`} >{transaction.kind === "payment" ? <HandCoins size={20} /> : <ReceiptText size={20} />}</div>
          <div className="transaction-main"><strong>{transaction.title}</strong><span>{new Intl.DateTimeFormat(GREGORIAN_LOCALE, { year: "numeric", month: "short", day: "numeric" }).format(transaction.date)}</span>{transaction.dueDate && <small>الاستحقاق: {new Intl.DateTimeFormat(GREGORIAN_LOCALE).format(transaction.dueDate)}</small>}</div>
          <strong className={transaction.kind === "payment" ? "transaction-paid" : "transaction-debt"}>{transaction.kind === "payment" ? "−" : "+"}{money(transaction.amount)}</strong>
          <div className="transaction-receipt-actions">
            <a className={`transaction-share ${shareUrl ? "" : "disabled"}`} href={shareUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!shareUrl}><MessageCircle size={17} /> مشاركة عبر واتساب</a>
            <button type="button" className="transaction-print-button" onClick={() => setPrintTransaction(transaction)}><ReceiptText size={17} /> وصل طباعة</button>
          </div>
        </article>;
      })}</div> : <EmptyState icon={ReceiptText} title="لا توجد معاملات" text="ستظهر هنا عمليات البيع والتسديد الخاصة بهذا الزبون." />}
    </div>

    {action && <div className="sheet-backdrop" onMouseDown={closeAction}>
      <form className={`bottom-sheet account-action-sheet ${action === "sale" ? "customer-sale-sheet" : ""}`} role="dialog" aria-modal="true" aria-labelledby="account-action-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={submitAccountAction}>
        <div className="sheet-handle" />
        <div className="sheet-header"><div><h2 id="account-action-title">{action === "sale" ? "بيع للزبون" : "تسجيل تسديد"}</h2><p>{action === "sale" ? `اختر المواد لحساب ${account.customer.name}.` : `الدين الحالي ${money(account.totalDebt)}.`}</p></div><button type="button" className="sheet-close" onClick={closeAction} aria-label="إغلاق"><X size={20} /></button></div>
        {action === "payment" ? <label className="form-field"><span>مبلغ التسديد</span><div className="money-input"><input autoFocus inputMode="numeric" type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /><b>د.ع</b></div></label> : <>
          <label className="sale-search"><Search size={18} /><input autoFocus value={saleSearch} onChange={(event) => setSaleSearch(event.target.value)} placeholder="ابحث عن مادة..." /></label>
          {saleSearch.trim() ? <div className="sale-search-results">{saleProducts.length ? saleProducts.map((product) => <button type="button" className="sale-search-result" key={product.id} disabled={product.stock <= 0} onClick={() => addSaleProduct(product)}><div><strong>{product.name}</strong><span>{money(product.price)} · متوفر {product.stock}</span></div><span className="choose-product"><Plus size={16} /> اختيار</span></button>) : <div className="sale-products-empty">لا توجد مادة مطابقة.</div>}</div> : !saleLines.length && <div className="sale-search-hint"><Search size={23} /><strong>ابحث عن مادة لإضافتها</strong><span>لن تظهر مواد المخزون إلا بعد البحث عنها.</span></div>}
          {saleLines.length > 0 && <div className="selected-sale-section"><strong className="selected-sale-title">المواد المختارة</strong><div className="sale-products-list">{saleLines.map((product) => {
            const quantity = saleCart[product.id];
            return <article className="sale-product-row selected" key={product.id}>
              <div className="sale-product-info"><strong>{product.name}</strong><span>{money(product.price)} · متوفر {product.stock}</span></div>
              <div className="sale-quantity"><button type="button" onClick={() => changeSaleQuantity(product, -1)} aria-label={`إنقاص ${product.name}`}><Minus size={17} /></button><b>{quantity}</b><button type="button" disabled={quantity >= product.stock} onClick={() => changeSaleQuantity(product, 1)} aria-label={`زيادة ${product.name}`}><Plus size={17} /></button></div>
            </article>;
          })}</div></div>}
          <div className="sale-summary-box"><div><span>عدد المواد</span><b>{saleLines.reduce((sum, product) => sum + saleCart[product.id], 0)}</b></div><div><span>المبلغ الكلي</span><strong>{money(saleTotal)}</strong></div></div>
          <label className="form-field optional-payment"><span>دفع من المبلغ <small>اختياري</small></span><div className="money-input"><input inputMode="numeric" type="number" min="0" max={saleTotal || undefined} step="1" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} placeholder="0" /><b>د.ع</b></div></label>
          <div className="remaining-debt-row"><span>المبلغ الذي سيبقى ديناً</span><strong>{money(saleRemaining)}</strong></div>
        </>}
        {actionError && <div className="form-error"><AlertTriangle size={16} />{actionError}</div>}
        <button className="save-product-button" type="submit" disabled={savingAction || (action === "sale" && !saleLines.length)}>{savingAction ? "جارٍ الحفظ..." : action === "sale" ? "تم" : "حفظ التسديد"}</button>
      </form>
    </div>}
    {printTransaction && <TransactionReceipt customer={account.customer} transaction={printTransaction} currentDebt={account.totalDebt} onClose={() => setPrintTransaction(null)} />}
  </section>;
}

function normalizeWhatsappPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("964")) return digits;
  if (digits.startsWith("0")) return `964${digits.slice(1)}`;
  return `964${digits}`;
}

function whatsappTransactionUrl(
  customerName: string,
  customerPhone: string,
  transaction: CustomerTransaction,
  remainingDebt: number,
) {
  const phone = normalizeWhatsappPhone(customerPhone);
  const dateFormat = new Intl.DateTimeFormat(GREGORIAN_LOCALE, { year: "numeric", month: "long", day: "numeric" });
  const lines = [
    `مرحباً ${customerName}، هذه تفاصيل المعاملة:`,
    `نوع المعاملة: ${transaction.title}`,
    `التاريخ: ${dateFormat.format(transaction.date)}`,
    `المبلغ: ${money(transaction.amount)}`,
  ];
  if (transaction.dueDate) lines.push(`تاريخ الاستحقاق: ${dateFormat.format(transaction.dueDate)}`);
  if (transaction.kind === "sale") {
    lines.push(`المدفوع: ${money(transaction.paidAmount ?? 0)}`, `المتبقي من البيع: ${money(transaction.remainingAmount ?? 0)}`);
  }
  lines.push(`الدين المتبقي حالياً: ${money(remainingDebt)}`, "مع الشكر.");
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}` : "";
}

function whatsappReminderUrl(account: OverdueAccount) {
  const phone = normalizeWhatsappPhone(account.phone);
  const dateFormat = new Intl.DateTimeFormat(GREGORIAN_LOCALE, { year: "numeric", month: "long", day: "numeric" });
  const today = dateFormat.format(Date.now());
  const dueDate = dateFormat.format(account.dueDate);
  const message = `مرحباً ${account.name}، نذكّركم بوجود مبلغ متأخر.\nتاريخ اليوم: ${today}\nتاريخ الاستحقاق: ${dueDate}\nمدة التأخير: ${account.overdueDays} يوم\nالمبلغ المتبقي: ${money(account.amount)}\nيرجى التواصل معنا عند التسديد، مع الشكر.`;
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : "";
}

function OverdueView({ accounts }: { accounts: OverdueAccount[] }) {
  const total = accounts.reduce((sum, account) => sum + account.amount, 0);
  return <section className="view-stack">
    <div className={`overdue-banner ${accounts.length ? "" : "clear"}`}><div><span className="banner-icon">{accounts.length ? <AlertTriangle /> : <CheckCircle2 />}</span><div><strong>{accounts.length ? `${accounts.length} زبون لديهم أقساط متأخرة` : "لا توجد أقساط متأخرة"}</strong><p>{accounts.length ? `إجمالي المبالغ المطلوبة ${money(total)}` : "ستظهر هنا الحسابات التي تتجاوز موعد الاستحقاق."}</p></div></div></div>
    {accounts.length ? <div className="overdue-grid">{accounts.map((account, index) => {
      const reminderUrl = whatsappReminderUrl(account);
      return <article className="overdue-card" key={account.id}>
        <div className="overdue-card-top"><span className="sequence-number">{index + 1}</span><div className="avatar">{account.name.charAt(0)}</div><div><h3>{account.name}</h3><span>{account.phone}</span></div><span className="days-late">متأخر {account.overdueDays} يوم</span></div>
        <div className="overdue-amount"><span>المبلغ المتبقي</span><strong>{money(account.amount)}</strong></div>
        <div className="due-date"><span>تاريخ الاستحقاق</span><b>{new Intl.DateTimeFormat(GREGORIAN_LOCALE).format(account.dueDate)}</b></div>
        <div className="card-actions whatsapp-actions">
          <a className={`whatsapp-button ${reminderUrl ? "" : "disabled"}`} href={reminderUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!reminderUrl}><MessageCircle size={18} /> تذكير عبر واتساب</a>
          <button className="secondary-button">فتح الحساب</button>
        </div>
        {!reminderUrl && <small className="phone-warning">أضف رقم هاتف صحيحاً للزبون لتفعيل واتساب.</small>}
      </article>;
    })}</div> : <div className="panel"><EmptyState icon={Clock3} title="قائمة المتأخرين فارغة" text="لا توجد بيانات متأخرة مسجلة حالياً." /></div>}
  </section>;
}

function PosView({ productsData, cart, cartLines, total, query, setQuery, changeQuantity, clearCart }: { productsData: Product[]; cart: Record<string, number>; cartLines: Product[]; total: number; query: string; setQuery: (value: string) => void; changeQuantity: (id: string, delta: number) => void; clearCart: () => void }) {
  const createCashSale = useMutation(api.sales.createCashSale);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [saleError, setSaleError] = useState("");
  const [savingSale, setSavingSale] = useState(false);
  const searchResults = query.trim() ? productsData.filter((product) => product.name.includes(query.trim()) && !cart[product.id]).slice(0, 8) : [];
  const totalQuantity = cartLines.reduce((sum, product) => sum + cart[product.id], 0);

  const selectProduct = (product: Product) => {
    if (product.stock <= 0) return;
    changeQuantity(product.id, 1);
    setQuery("");
    setSaleError("");
  };

  const submitDirectSale = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = customerName.trim();
    const phone = customerPhone.trim();
    if (!cartLines.length) return setSaleError("أضف مادة واحدة على الأقل.");
    if (!name) return setSaleError("اكتب اسم المشتري.");
    if (phone.replace(/\D/g, "").length < 10) return setSaleError("اكتب رقم واتساب صحيحاً.");
    setSavingSale(true);
    setSaleError("");
    try {
      await createCashSale({ discount: 0, customerName: name, customerPhone: phone, items: cartLines.map((product) => ({ productId: product.id as Id<"products">, quantity: cart[product.id] })) });
      clearCart();
      setCustomerName("");
      setCustomerPhone("");
      setQuery("");
    } catch {
      setSaleError("تعذر حفظ عملية البيع. وظائف Convex الجديدة تحتاج إلى النشر أولاً.");
    } finally {
      setSavingSale(false);
    }
  };

  return <form className="direct-sale-view" onSubmit={submitDirectSale}>
    <section className="panel direct-sale-products">
      <div className="direct-sale-heading"><div><h2>البيع المباشر</h2><p>ابحث عن المواد وأضفها إلى الفاتورة.</p></div><span><ShoppingCart size={18} />{totalQuantity}</span></div>
      <label className="direct-sale-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن منتج..." /></label>
      {query.trim() ? <div className="direct-search-results">{searchResults.length ? searchResults.map((product) => <button type="button" key={product.id} disabled={product.stock <= 0} onClick={() => selectProduct(product)}><div><strong>{product.name}</strong><span>{money(product.price)} · المتبقي في المخزن {product.stock}</span></div><span className="direct-add"><Plus size={16} /> إضافة</span></button>) : <div className="direct-search-empty">لا يوجد منتج مطابق.</div>}</div> : !cartLines.length && <div className="direct-search-hint"><Search size={25} /><strong>ابحث عن منتج لبدء البيع</strong><span>لن تظهر مواد المخزون إلا عند البحث.</span></div>}
      {cartLines.length > 0 && <div className="direct-selected-products"><strong className="direct-section-title">المنتجات المختارة</strong>{cartLines.map((product) => <article key={product.id}><div><strong>{product.name}</strong><span>{money(product.price)} · بعد البيع يبقى {product.stock - cart[product.id]} في المخزن</span></div><div className="direct-quantity"><button type="button" onClick={() => changeQuantity(product.id, -1)} aria-label={`إنقاص ${product.name}`}><Minus size={17} /></button><b>{cart[product.id]}</b><button type="button" disabled={cart[product.id] >= product.stock} onClick={() => changeQuantity(product.id, 1)} aria-label={`زيادة ${product.name}`}><Plus size={17} /></button></div></article>)}</div>}
    </section>

    <section className="panel direct-checkout">
      <div className="direct-total"><span>السعر الكلي</span><strong>{money(total)}</strong><small>بيع نقدي — لا يوجد دين</small></div>
      <label className="form-field locked-payment"><span>المبلغ المدفوع تلقائياً</span><div className="money-input"><input readOnly value={total ? new Intl.NumberFormat("ar-IQ").format(total) : "0"} /><b>د.ع</b></div></label>
      <div className="direct-buyer-fields">
        <label className="form-field"><span>اسم المشتري</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="أدخل الاسم" /></label>
        <label className="form-field"><span>رقم الواتساب</span><input type="tel" inputMode="tel" dir="ltr" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="07XX XXX XXXX" /></label>
      </div>
      {saleError && <div className="form-error"><AlertTriangle size={16} />{saleError}</div>}
      <button className="complete-direct-sale" type="submit" disabled={savingSale || !cartLines.length}><CheckCircle2 size={20} />{savingSale ? "جارٍ الحفظ..." : "تم البيع"}</button>
    </section>
  </form>;
}

type DirectSaleRecord = {
  _id: Id<"sales">;
  customerName?: string;
  customerPhone?: string;
  total: number;
  createdAt: number;
  items: Array<{ _id: string; productId: Id<"products">; productName: string; quantity: number; unitPrice: number; total: number }>;
};

function directSaleWhatsappUrl(sale: DirectSaleRecord) {
  const phone = normalizeWhatsappPhone(sale.customerPhone ?? "");
  if (!phone) return "";
  const lines = [
    `مرحباً ${sale.customerName || "عميلنا"}، تفاصيل عملية البيع:`,
    ...sale.items.map((item) => `${item.productName}: ${item.quantity} × ${money(item.unitPrice)} = ${money(item.total)}`),
    `المجموع المدفوع: ${money(sale.total)}`,
    `التاريخ: ${new Intl.DateTimeFormat(GREGORIAN_LOCALE, { year: "numeric", month: "long", day: "numeric" }).format(sale.createdAt)}`,
    "شكراً لتعاملكم معنا.",
  ];
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function DirectSaleReceipt({ sale, onClose }: { sale: DirectSaleRecord; onClose: () => void }) {
  const dateTimeFormat = new Intl.DateTimeFormat(GREGORIAN_LOCALE, { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  const receiptNumber = sale._id.slice(-8).toUpperCase();
  return <div className="receipt-print-layer" role="dialog" aria-modal="true" aria-labelledby="direct-receipt-title" onMouseDown={onClose}>
    <div className="receipt-dialog" onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" className="receipt-close" onClick={onClose} aria-label="إغلاق الوصل"><X size={20} /></button>
      <article className="receipt-paper direct-receipt-paper">
        <header className="receipt-image-header"><img src={receiptHeaderUrl} alt="جمعية البيت الأبيض للأثاث" /></header>
        <div className="receipt-contact"><span dir="ltr">0781 324 9709</span><i /><span dir="ltr">0775 888 7900</span></div>
        <div className="receipt-title-row"><div><span id="direct-receipt-title">وصل بيع مباشر</span><small>رقم الوصل: {receiptNumber}</small></div><b>مدفوع بالكامل</b></div>
        <dl className="receipt-details">
          <div><dt>اسم المشتري</dt><dd>{sale.customerName || "مشتري نقدي"}</dd></div>
          <div><dt>رقم الهاتف</dt><dd dir="ltr">{sale.customerPhone || "—"}</dd></div>
          <div><dt>تاريخ البيع</dt><dd>{dateTimeFormat.format(sale.createdAt)}</dd></div>
          <div><dt>تاريخ ووقت الطباعة</dt><dd>{dateTimeFormat.format(Date.now())}</dd></div>
        </dl>
        <div className="direct-receipt-items">
          <div className="direct-receipt-table-head"><span>المادة</span><span>العدد</span><span>السعر</span><span>المجموع</span></div>
          {sale.items.map((item) => <div className="direct-receipt-table-row" key={item._id}><strong>{item.productName}</strong><span>{item.quantity}</span><span>{money(item.unitPrice)}</span><b>{money(item.total)}</b></div>)}
        </div>
        <div className="receipt-amounts">
          <div><span>المبلغ الكلي</span><strong>{money(sale.total)}</strong></div>
          <div className="receipt-paid"><span>المبلغ المدفوع</span><strong>{money(sale.total)}</strong></div>
          <div className="receipt-remaining"><span>المتبقي</span><strong>{money(0)}</strong></div>
        </div>
        <footer className="receipt-footer"><strong>شكراً لتعاملكم معنا</strong><span>التوقيع والختم</span></footer>
      </article>
      <div className="receipt-preview-actions"><button type="button" onClick={onClose}>إلغاء</button><button type="button" className="print-receipt-now" onClick={() => window.print()}><ReceiptText size={18} /> طباعة الوصل</button></div>
    </div>
  </div>;
}

function StatsView({ products }: { products: Product[] }) {
  const convex = useConvex();
  const updateDirectSale = useMutation(api.sales.updateDirectSale);
  const deleteDirectSale = useMutation(api.sales.deleteDirectSale);
  const [sales, setSales] = useState<DirectSaleRecord[]>([]);
  const [editSale, setEditSale] = useState<DirectSaleRecord | null>(null);
  const [editCart, setEditCart] = useState<Record<string, number>>({});
  const [editSearch, setEditSearch] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [statsError, setStatsError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [printSale, setPrintSale] = useState<DirectSaleRecord | null>(null);
  const editLines = products.filter((product) => editCart[product.id]);
  const editTotal = editLines.reduce((sum, product) => sum + product.price * editCart[product.id], 0);
  const editSearchResults = editSearch.trim() ? products.filter((product) => product.name.includes(editSearch.trim()) && !editCart[product.id]).slice(0, 8) : [];
  const salesTotal = sales.reduce((sum, sale) => sum + sale.total, 0);

  const refreshSales = async () => {
    try {
      const result = await convex.query(api.sales.listRecentDirectSales, {});
      setSales(result);
    } catch {
      // تظهر البيانات بعد نشر وظائف Convex الجديدة إلى Production.
    }
  };

  useEffect(() => { void refreshSales(); }, []);

  const openSaleEdit = (sale: DirectSaleRecord) => {
    setEditSale(sale);
    setEditName(sale.customerName ?? "");
    setEditPhone(sale.customerPhone ?? "");
    setEditCart(Object.fromEntries(sale.items.map((item) => [item.productId, item.quantity])));
    setEditSearch("");
    setStatsError("");
  };

  const closeSaleEdit = () => {
    if (savingEdit) return;
    setEditSale(null);
    setStatsError("");
  };

  const changeEditQuantity = (product: Product, delta: number) => {
    const originalQuantity = editSale?.items.find((item) => item.productId === product.id)?.quantity ?? 0;
    const maximum = product.stock + originalQuantity;
    setEditCart((current) => {
      const next = Math.max(0, Math.min(maximum, (current[product.id] || 0) + delta));
      if (!next) {
        const { [product.id]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [product.id]: next };
    });
  };

  const submitSaleEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editSale || !editLines.length) return setStatsError("يجب أن تحتوي المعاملة على مادة واحدة.");
    if (!editName.trim()) return setStatsError("اكتب اسم المشتري.");
    if (editPhone.replace(/\D/g, "").length < 10) return setStatsError("اكتب رقم واتساب صحيحاً.");
    setSavingEdit(true);
    setStatsError("");
    try {
      await updateDirectSale({ saleId: editSale._id, customerName: editName.trim(), customerPhone: editPhone.trim(), items: editLines.map((product) => ({ productId: product.id as Id<"products">, quantity: editCart[product.id] })) });
      await refreshSales();
      setEditSale(null);
    } catch {
      setStatsError("تعذر تعديل المعاملة. وظائف Convex الجديدة تحتاج إلى النشر أولاً.");
    } finally {
      setSavingEdit(false);
    }
  };

  const removeSale = async (saleId: Id<"sales">) => {
    setStatsError("");
    try {
      await deleteDirectSale({ saleId });
      setSales((current) => current.filter((sale) => sale._id !== saleId));
    } catch {
      setStatsError("تعذر حذف المعاملة. وظائف Convex الجديدة تحتاج إلى النشر أولاً.");
    }
  };

  return <section className="view-stack">
    <div className="metrics-grid stats-metrics">
      <MetricCard icon={CircleDollarSign} tone="green" label="مبيعات 30 يوم" value={money(salesTotal)} foot={`${sales.length} معاملة بيع مباشر`} />
      <MetricCard icon={TrendingUp} tone="gold" label="متوسط المعاملة" value={money(sales.length ? Math.round(salesTotal / sales.length) : 0)} foot="محسوب من المبيعات" />
      <MetricCard icon={ShoppingBasket} tone="blue" label="المنتجات المباعة" value={String(sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0))} foot="خلال آخر 30 يوماً" />
      <MetricCard icon={Clock3} tone="red" label="مدة الاحتفاظ" value="30 يوم" foot="ثم تُحذف تلقائياً" />
    </div>
    <div className="panel direct-sales-history">
      <div className="transactions-heading"><div><h2>معاملات البيع المباشر</h2><p>يمكن تعديلها أو حذفها ومشاركتها عبر واتساب.</p></div><span>{sales.length}</span></div>
      {statsError && !editSale && <div className="stats-inline-error"><AlertTriangle size={16} />{statsError}</div>}
      {sales.length ? <div className="direct-sales-list">{sales.map((sale) => {
        const shareUrl = directSaleWhatsappUrl(sale);
        return <article className="direct-sale-record" key={sale._id}>
          <div className="direct-sale-record-head"><div><strong>{sale.customerName || "مشتري نقدي"}</strong><span>{sale.customerPhone || "لا يوجد رقم واتساب"}</span></div><strong>{money(sale.total)}</strong></div>
          <div className="direct-sale-items">{sale.items.map((item) => <span key={item._id}>{item.productName} × {item.quantity}</span>)}</div>
          <small className="direct-sale-date">{new Intl.DateTimeFormat(GREGORIAN_LOCALE, { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(sale.createdAt)}</small>
          <div className="direct-sale-actions"><button onClick={() => openSaleEdit(sale)}>تعديل</button><button className="delete-sale-button" onClick={() => void removeSale(sale._id)}>حذف</button><a className={shareUrl ? "" : "disabled"} href={shareUrl || undefined} target="_blank" rel="noreferrer"><MessageCircle size={16} /> مشاركة واتساب</a><button className="direct-print-button" onClick={() => setPrintSale(sale)}><ReceiptText size={16} /> وصل طباعة</button></div>
        </article>;
      })}</div> : <EmptyState icon={BarChart3} title="لا توجد معاملات بيع مباشر" text="ستظهر هنا المعاملات لمدة 30 يوماً بعد إتمام البيع." />}
    </div>

    {editSale && <div className="sheet-backdrop" onMouseDown={closeSaleEdit}><form className="bottom-sheet customer-sale-sheet" role="dialog" aria-modal="true" aria-labelledby="edit-sale-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={submitSaleEdit}>
      <div className="sheet-handle" /><div className="sheet-header"><div><h2 id="edit-sale-title">تعديل معاملة البيع</h2><p>يُعاد حساب السعر من أسعار المنتجات تلقائياً.</p></div><button type="button" className="sheet-close" onClick={closeSaleEdit} aria-label="إغلاق"><X size={20} /></button></div>
      <label className="sale-search"><Search size={18} /><input value={editSearch} onChange={(event) => setEditSearch(event.target.value)} placeholder="ابحث لإضافة منتج..." /></label>
      {editSearch.trim() && <div className="sale-search-results">{editSearchResults.length ? editSearchResults.map((product) => <button type="button" className="sale-search-result" key={product.id} onClick={() => { setEditCart((current) => ({ ...current, [product.id]: 1 })); setEditSearch(""); }}><div><strong>{product.name}</strong><span>{money(product.price)} · متوفر {product.stock}</span></div><span className="choose-product"><Plus size={16} /> إضافة</span></button>) : <div className="sale-products-empty">لا توجد مادة مطابقة.</div>}</div>}
      <div className="sale-products-list">{editLines.map((product) => { const originalQuantity = editSale.items.find((item) => item.productId === product.id)?.quantity ?? 0; return <article className="sale-product-row selected" key={product.id}><div className="sale-product-info"><strong>{product.name}</strong><span>{money(product.price)} · المتاح {product.stock + originalQuantity}</span></div><div className="sale-quantity"><button type="button" onClick={() => changeEditQuantity(product, -1)}><Minus size={17} /></button><b>{editCart[product.id]}</b><button type="button" disabled={editCart[product.id] >= product.stock + originalQuantity} onClick={() => changeEditQuantity(product, 1)}><Plus size={17} /></button></div></article>; })}</div>
      <div className="sale-summary-box"><div><span>عدد المواد</span><b>{editLines.reduce((sum, product) => sum + editCart[product.id], 0)}</b></div><div><span>السعر الكلي</span><strong>{money(editTotal)}</strong></div></div>
      <label className="form-field"><span>اسم المشتري</span><input value={editName} onChange={(event) => setEditName(event.target.value)} /></label><label className="form-field"><span>رقم الواتساب</span><input dir="ltr" type="tel" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} /></label>
      {statsError && <div className="form-error"><AlertTriangle size={16} />{statsError}</div>}<button className="save-product-button" type="submit" disabled={savingEdit || !editLines.length}>{savingEdit ? "جارٍ الحفظ..." : "حفظ التعديل"}</button>
    </form></div>}
    {printSale && <DirectSaleReceipt sale={printSale} onClose={() => setPrintSale(null)} />}
  </section>;
}

export default App;
