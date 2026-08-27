import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  AlertTriangle,
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
  Minus,
  PackagePlus,
  Plus,
  Search,
  ShoppingBasket,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type TabId = "inventory" | "customers" | "overdue" | "pos" | "stats";
type Icon = typeof Box;
type Product = { id: string; name: string; category: string; sku: string; stock: number; price: number; buy: number };
type Customer = { name: string; phone: string; debt: number; paid: number; next: string; status: string };

const tabs: { id: TabId; label: string; icon: Icon }[] = [
  { id: "inventory", label: "المخزون", icon: Box },
  { id: "customers", label: "الزبائن", icon: Users },
  { id: "overdue", label: "المتأخرون", icon: Clock3 },
  { id: "pos", label: "البيع المباشر", icon: ShoppingCart },
  { id: "stats", label: "الإحصائيات", icon: BarChart3 },
];

const money = (value: number) => `${new Intl.NumberFormat("ar-IQ").format(value)} د.ع`;

function App() {
  const convexProducts = useQuery(api.products.list);
  const convexCustomers = useQuery(api.customers.list);
  const [activeTab, setActiveTab] = useState<TabId>("inventory");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
        name: customer.name,
        phone: customer.phone,
        debt: 0,
        paid: 0,
        next: "—",
        status: customer.active ? "منتظم" : "موقوف",
      }))
    : [];
  const convexConnected = convexProducts !== undefined && convexCustomers !== undefined;

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
  };

  const changeQuantity = (id: string, delta: number) => {
    setCart((currentCart) => {
      const next = Math.max(0, (currentCart[id] || 0) + delta);
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

        <div className="environment-pill"><span className={`live-dot ${convexConnected ? "" : "connecting"}`} /> {convexConnected ? "متصل ببيئة الاختبار" : "جارٍ الاتصال"} <b>Development</b></div>

        <nav className="main-nav" aria-label="التبويبات الرئيسية">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => changeTab(tab.id)}>
                <TabIcon size={20} />
                <span>{tab.label}</span>
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
            <div className="date-chip"><span>الخميس</span><strong>27 آب 2026</strong></div>
            <button className="icon-button notification" aria-label="الإشعارات"><Bell /><i /></button>
          </div>
        </header>

        {activeTab === "inventory" && <InventoryView products={filteredProducts} query={query} setQuery={setQuery} />}
        {activeTab === "customers" && <CustomersView customers={filteredCustomers} query={query} setQuery={setQuery} />}
        {activeTab === "overdue" && <OverdueView />}
        {activeTab === "pos" && <PosView productsData={productRows} cart={cart} cartLines={cartLines} total={cartTotal} query={query} setQuery={setQuery} changeQuantity={changeQuantity} />}
        {activeTab === "stats" && <StatsView />}
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
  return <section className="view-stack">
    <div className="metrics-grid">
      <MetricCard icon={Box} tone="green" label="إجمالي المنتجات" value={String(visible.length)} foot="منتج مسجل" />
      <MetricCard icon={CircleDollarSign} tone="gold" label="قيمة المخزون" value={money(visible.reduce((sum, product) => sum + product.buy * product.stock, 0))} foot="بسعر الشراء" />
      <MetricCard icon={AlertTriangle} tone="red" label="مخزون منخفض" value={String(visible.filter((product) => product.stock <= 3).length)} foot="تحتاج إعادة تجهيز" />
      <MetricCard icon={PackagePlus} tone="blue" label="نتائج البحث" value={String(visible.length)} foot="حسب التصفية الحالية" />
    </div>
    <div className="panel">
      <div className="panel-header"><div><h2>قائمة المخزون</h2><p>تابع الكميات والأسعار وحالة كل منتج.</p></div><div className="panel-actions"><SearchBox value={query} onChange={setQuery} placeholder="ابحث عن منتج أو رمز..." /><button className="primary-button"><Plus size={18} /> إضافة منتج</button></div></div>
      <div className="data-table-wrap">{visible.length ? <table className="data-table"><thead><tr><th>المنتج</th><th>التصنيف</th><th>الرمز</th><th>المتوفر</th><th>سعر البيع</th><th>الحالة</th></tr></thead><tbody>{visible.map((product) => <tr key={product.id}><td data-label="المنتج"><div className="product-name"><span className="product-thumb"><ShoppingBasket size={20} /></span><strong>{product.name}</strong></div></td><td data-label="التصنيف">{product.category}</td><td data-label="الرمز"><code>{product.sku}</code></td><td data-label="المتوفر"><b>{product.stock}</b> قطعة</td><td data-label="سعر البيع"><strong>{money(product.price)}</strong></td><td data-label="الحالة"><span className={`status ${product.stock <= 3 ? "danger" : product.stock <= 8 ? "warning" : "success"}`}>{product.stock <= 3 ? "منخفض" : product.stock <= 8 ? "متوسط" : "متوفر"}</span></td></tr>)}</tbody></table> : <EmptyState icon={Box} title="المخزون فارغ" text="أضف أول منتج لبدء إدارة المخزون." />}</div>
    </div>
  </section>;
}

function CustomersView({ customers: visible, query, setQuery }: { customers: Customer[]; query: string; setQuery: (value: string) => void }) {
  return <section className="view-stack">
    <div className="metrics-grid three">
      <MetricCard icon={Users} tone="green" label="عدد الزبائن" value={String(visible.length)} foot="زبون مسجل" />
      <MetricCard icon={CreditCard} tone="gold" label="إجمالي الديون" value={money(visible.reduce((sum, customer) => sum + customer.debt, 0))} foot="الحسابات الحالية" />
      <MetricCard icon={CheckCircle2} tone="blue" label="المُحصّل هذا الشهر" value={money(0)} foot="لا توجد دفعات بعد" />
    </div>
    <div className="panel">
      <div className="panel-header"><div><h2>سجل الزبائن</h2><p>تفاصيل الحساب والأقساط القادمة.</p></div><div className="panel-actions"><SearchBox value={query} onChange={setQuery} placeholder="اسم الزبون أو رقم الهاتف..." /><button className="primary-button"><UserPlus size={18} /> زبون جديد</button></div></div>
      <div className="customer-list">{visible.length ? visible.map((customer, index) => <article className="customer-row" key={customer.phone}><div className={`avatar avatar-${index % 4}`}>{customer.name.charAt(0)}</div><div className="customer-main"><strong>{customer.name}</strong><span>{customer.phone}</span></div><div><small>المبلغ المتبقي</small><strong className={customer.debt ? "debt-value" : "paid-value"}>{customer.debt ? money(customer.debt) : "لا يوجد دين"}</strong></div><div><small>القسط القادم</small><strong>{customer.next}</strong></div><span className={`status ${customer.status === "متأخر" ? "danger" : customer.status === "مكتمل" ? "success" : "info"}`}>{customer.status}</span><button className="ghost-button">فتح الحساب <ChevronLeft size={16} /></button></article>) : <EmptyState icon={Users} title="لا يوجد زبائن" text="أضف أول زبون لفتح حساب جديد." />}</div>
    </div>
  </section>;
}

function OverdueView() {
  return <section className="view-stack">
    <div className="overdue-banner clear"><div><span className="banner-icon"><CheckCircle2 /></span><div><strong>لا توجد أقساط متأخرة</strong><p>ستظهر هنا الحسابات التي تتجاوز موعد الاستحقاق.</p></div></div></div>
    <div className="panel"><EmptyState icon={Clock3} title="قائمة المتأخرين فارغة" text="لا توجد بيانات متأخرة مسجلة حالياً." /></div>
  </section>;
}

function PosView({ productsData, cart, cartLines, total, query, setQuery, changeQuantity }: { productsData: Product[]; cart: Record<string, number>; cartLines: Product[]; total: number; query: string; setQuery: (value: string) => void; changeQuantity: (id: string, delta: number) => void }) {
  const visible = productsData.filter((product) => product.name.includes(query) || product.category.includes(query));
  return <section className="pos-layout">
    <div className="panel products-panel"><div className="panel-header"><div><h2>اختر المنتجات</h2><p>اضغط على المنتج لإضافته إلى الفاتورة.</p></div><SearchBox value={query} onChange={setQuery} placeholder="ابحث في المنتجات..." /></div><div className="product-grid">{visible.length ? visible.map((product) => <button className="product-card" key={product.id} onClick={() => changeQuantity(product.id, 1)}><span className="product-art"><ShoppingBasket /></span><span className="product-category">{product.category}</span><strong>{product.name}</strong><b>{money(product.price)}</b><small>متوفر {product.stock}</small><span className="add-circle"><Plus size={17} /></span></button>) : <EmptyState icon={Box} title="لا توجد منتجات للبيع" text="أضف المنتجات إلى المخزون أولاً." />}</div></div>
    <aside className="checkout-panel"><div className="checkout-title"><div><ShoppingCart /><span>{cartLines.reduce((sum, product) => sum + cart[product.id], 0)}</span></div><div><h2>الفاتورة الحالية</h2><p>بيع مباشر — نقداً</p></div></div>
      <div className="cart-lines">{cartLines.length ? cartLines.map((product) => <div className="cart-line" key={product.id}><div><strong>{product.name}</strong><span>{money(product.price)}</span></div><div className="quantity"><button onClick={() => changeQuantity(product.id, -1)}><Minus size={14} /></button><b>{cart[product.id]}</b><button onClick={() => changeQuantity(product.id, 1)}><Plus size={14} /></button></div></div>) : <div className="empty-cart"><ShoppingBasket size={38} /><strong>الفاتورة فارغة</strong><span>اختر منتجاً لإضافته</span></div>}</div>
      <div className="checkout-summary"><div><span>المجموع الفرعي</span><b>{money(total)}</b></div><div><span>الخصم</span><b>0 د.ع</b></div><div className="grand-total"><span>الإجمالي</span><strong>{money(total)}</strong></div></div>
      <button className="checkout-button" disabled={!total}><CheckCircle2 /> إتمام البيع</button>
    </aside>
  </section>;
}

function StatsView() {
  return <section className="view-stack">
    <div className="metrics-grid">
      <MetricCard icon={CircleDollarSign} tone="green" label="مبيعات الشهر" value={money(0)} foot="لا توجد مبيعات بعد" />
      <MetricCard icon={TrendingUp} tone="gold" label="صافي الأرباح" value={money(0)} foot="يُحسب من المبيعات" />
      <MetricCard icon={CreditCard} tone="blue" label="الديون النشطة" value={money(0)} foot="لا توجد حسابات نشطة" />
      <MetricCard icon={Clock3} tone="red" label="أقساط متأخرة" value={money(0)} foot="لا توجد أقساط متأخرة" />
    </div>
    <div className="stats-grid"><article className="panel chart-panel"><div className="panel-header"><div><h2>حركة المبيعات</h2><p>آخر سبعة أيام</p></div></div><EmptyState icon={BarChart3} title="لا توجد مبيعات" text="سيظهر الرسم بعد تسجيل أول عملية بيع." /></article>
      <article className="panel category-panel empty-category"><div className="panel-header"><div><h2>المبيعات حسب التصنيف</h2><p>توزيع هذا الشهر</p></div></div><EmptyState icon={LayoutDashboard} title="لا توجد بيانات" text="ستظهر التصنيفات بعد بدء البيع." /></article>
    </div>
  </section>;
}

export default App;
