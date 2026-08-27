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

const products: Product[] = [
  { id: "demo-1", name: "شاشة سمارت 43 بوصة", category: "أجهزة منزلية", sku: "TV-043", stock: 8, price: 385000, buy: 320000 },
  { id: "demo-2", name: "مبرد هواء صحراوي", category: "تبريد", sku: "CL-120", stock: 3, price: 175000, buy: 142000 },
  { id: "demo-3", name: "غسالة أوتوماتيك 8 كغم", category: "أجهزة منزلية", sku: "WM-080", stock: 11, price: 540000, buy: 468000 },
  { id: "demo-4", name: "هاتف ذكي 128GB", category: "هواتف", sku: "PH-128", stock: 2, price: 295000, buy: 258000 },
  { id: "demo-5", name: "مروحة عمودية", category: "تبريد", sku: "FN-018", stock: 24, price: 48000, buy: 36500 },
  { id: "demo-6", name: "سماعة لاسلكية", category: "إكسسوارات", sku: "AU-051", stock: 19, price: 35000, buy: 22000 },
];

const customers: Customer[] = [
  { name: "أحمد كريم", phone: "0770 123 4567", debt: 825000, paid: 475000, next: "2026/09/02", status: "منتظم" },
  { name: "زينب علي", phone: "0781 442 9012", debt: 340000, paid: 160000, next: "2026/08/30", status: "متأخر" },
  { name: "محمد جاسم", phone: "0750 221 8834", debt: 1200000, paid: 800000, next: "2026/09/06", status: "منتظم" },
  { name: "سارة حسين", phone: "0773 654 1208", debt: 210000, paid: 70000, next: "2026/08/25", status: "متأخر" },
  { name: "مصطفى ناصر", phone: "0780 771 4300", debt: 0, paid: 450000, next: "—", status: "مكتمل" },
];

const overdue = [
  { name: "سارة حسين", phone: "0773 654 1208", amount: 70000, days: 12, installments: "2 من 5" },
  { name: "زينب علي", phone: "0781 442 9012", amount: 85000, days: 7, installments: "3 من 7" },
  { name: "حيدر فاضل", phone: "0751 990 1172", amount: 120000, days: 3, installments: "1 من 4" },
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
    : products;
  const customerRows: Customer[] = convexCustomers?.length
    ? convexCustomers.map((customer) => ({
        name: customer.name,
        phone: customer.phone,
        debt: 0,
        paid: 0,
        next: "—",
        status: customer.active ? "منتظم" : "موقوف",
      }))
    : customers;
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
                {tab.id === "overdue" && <small>3</small>}
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

function InventoryView({ products: visible, query, setQuery }: { products: Product[]; query: string; setQuery: (value: string) => void }) {
  return <section className="view-stack">
    <div className="metrics-grid">
      <MetricCard icon={Box} tone="green" label="إجمالي المنتجات" value="67" foot="ضمن 8 تصنيفات" />
      <MetricCard icon={CircleDollarSign} tone="gold" label="قيمة المخزون" value="18.4 مليون" foot="بسعر الشراء" />
      <MetricCard icon={AlertTriangle} tone="red" label="مخزون منخفض" value="5" foot="تحتاج إعادة تجهيز" />
      <MetricCard icon={PackagePlus} tone="blue" label="دخل هذا الشهر" value="142" foot="قطعة جديدة" />
    </div>
    <div className="panel">
      <div className="panel-header"><div><h2>قائمة المخزون</h2><p>تابع الكميات والأسعار وحالة كل منتج.</p></div><div className="panel-actions"><SearchBox value={query} onChange={setQuery} placeholder="ابحث عن منتج أو رمز..." /><button className="primary-button"><Plus size={18} /> إضافة منتج</button></div></div>
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>المنتج</th><th>التصنيف</th><th>الرمز</th><th>المتوفر</th><th>سعر البيع</th><th>الحالة</th></tr></thead><tbody>{visible.map((product) => <tr key={product.id}><td><div className="product-name"><span className="product-thumb"><ShoppingBasket size={20} /></span><strong>{product.name}</strong></div></td><td>{product.category}</td><td><code>{product.sku}</code></td><td><b>{product.stock}</b> قطعة</td><td><strong>{money(product.price)}</strong></td><td><span className={`status ${product.stock <= 3 ? "danger" : product.stock <= 8 ? "warning" : "success"}`}>{product.stock <= 3 ? "منخفض" : product.stock <= 8 ? "متوسط" : "متوفر"}</span></td></tr>)}</tbody></table></div>
    </div>
  </section>;
}

function CustomersView({ customers: visible, query, setQuery }: { customers: Customer[]; query: string; setQuery: (value: string) => void }) {
  return <section className="view-stack">
    <div className="metrics-grid three">
      <MetricCard icon={Users} tone="green" label="عدد الزبائن" value="48" foot="6 زبائن جدد هذا الشهر" />
      <MetricCard icon={CreditCard} tone="gold" label="إجمالي الديون" value="7.8 مليون" foot="على 31 زبوناً" />
      <MetricCard icon={CheckCircle2} tone="blue" label="المُحصّل هذا الشهر" value="2.1 مليون" foot="نسبة تحصيل 72%" />
    </div>
    <div className="panel">
      <div className="panel-header"><div><h2>سجل الزبائن</h2><p>تفاصيل الحساب والأقساط القادمة.</p></div><div className="panel-actions"><SearchBox value={query} onChange={setQuery} placeholder="اسم الزبون أو رقم الهاتف..." /><button className="primary-button"><UserPlus size={18} /> زبون جديد</button></div></div>
      <div className="customer-list">{visible.map((customer, index) => <article className="customer-row" key={customer.phone}><div className={`avatar avatar-${index % 4}`}>{customer.name.charAt(0)}</div><div className="customer-main"><strong>{customer.name}</strong><span>{customer.phone}</span></div><div><small>المبلغ المتبقي</small><strong className={customer.debt ? "debt-value" : "paid-value"}>{customer.debt ? money(customer.debt) : "تم التسديد"}</strong></div><div><small>القسط القادم</small><strong>{customer.next}</strong></div><span className={`status ${customer.status === "متأخر" ? "danger" : customer.status === "مكتمل" ? "success" : "info"}`}>{customer.status}</span><button className="ghost-button">فتح الحساب <ChevronLeft size={16} /></button></article>)}</div>
    </div>
  </section>;
}

function OverdueView() {
  return <section className="view-stack">
    <div className="overdue-banner"><div><span className="banner-icon"><AlertTriangle /></span><div><strong>3 زبائن لديهم أقساط متأخرة</strong><p>إجمالي المبالغ المطلوبة حالياً {money(275000)}</p></div></div><button className="light-button">تصدير قائمة المتأخرين</button></div>
    <div className="overdue-grid">{overdue.map((item) => <article className="overdue-card" key={item.phone}><div className="overdue-card-top"><div className="avatar">{item.name.charAt(0)}</div><div><h3>{item.name}</h3><span>{item.phone}</span></div><span className="days-late">متأخر {item.days} يوم</span></div><div className="overdue-amount"><span>القسط المطلوب</span><strong>{money(item.amount)}</strong></div><div className="installment-line"><span>تقدم الأقساط</span><b>{item.installments}</b></div><div className="progress"><i style={{ width: `${Math.max(20, 100 - item.days * 3)}%` }} /></div><div className="card-actions"><button className="primary-button">تسجيل دفعة</button><button className="secondary-button">عرض الحساب</button></div></article>)}</div>
    <div className="panel reminder-panel"><div><div className="reminder-icon"><Bell /></div><div><h3>تذكير سريع</h3><p>يمكنك إرسال تذكير واتساب للزبون من صفحة حسابه بعد مراجعة المبلغ.</p></div></div><button className="secondary-button">إعداد التذكيرات</button></div>
  </section>;
}

function PosView({ productsData, cart, cartLines, total, query, setQuery, changeQuantity }: { productsData: Product[]; cart: Record<string, number>; cartLines: Product[]; total: number; query: string; setQuery: (value: string) => void; changeQuantity: (id: string, delta: number) => void }) {
  const visible = productsData.filter((product) => product.name.includes(query) || product.category.includes(query));
  return <section className="pos-layout">
    <div className="panel products-panel"><div className="panel-header"><div><h2>اختر المنتجات</h2><p>اضغط على المنتج لإضافته إلى الفاتورة.</p></div><SearchBox value={query} onChange={setQuery} placeholder="ابحث في المنتجات..." /></div><div className="product-grid">{visible.map((product) => <button className="product-card" key={product.id} onClick={() => changeQuantity(product.id, 1)}><span className="product-art"><ShoppingBasket /></span><span className="product-category">{product.category}</span><strong>{product.name}</strong><b>{money(product.price)}</b><small>متوفر {product.stock}</small><span className="add-circle"><Plus size={17} /></span></button>)}</div></div>
    <aside className="checkout-panel"><div className="checkout-title"><div><ShoppingCart /><span>{cartLines.reduce((sum, product) => sum + cart[product.id], 0)}</span></div><div><h2>الفاتورة الحالية</h2><p>بيع مباشر — نقداً</p></div></div>
      <div className="cart-lines">{cartLines.length ? cartLines.map((product) => <div className="cart-line" key={product.id}><div><strong>{product.name}</strong><span>{money(product.price)}</span></div><div className="quantity"><button onClick={() => changeQuantity(product.id, -1)}><Minus size={14} /></button><b>{cart[product.id]}</b><button onClick={() => changeQuantity(product.id, 1)}><Plus size={14} /></button></div></div>) : <div className="empty-cart"><ShoppingBasket size={38} /><strong>الفاتورة فارغة</strong><span>اختر منتجاً لإضافته</span></div>}</div>
      <div className="checkout-summary"><div><span>المجموع الفرعي</span><b>{money(total)}</b></div><div><span>الخصم</span><b>0 د.ع</b></div><div className="grand-total"><span>الإجمالي</span><strong>{money(total)}</strong></div></div>
      <button className="checkout-button" disabled={!total}><CheckCircle2 /> إتمام البيع</button>
    </aside>
  </section>;
}

function StatsView() {
  const bars = [42, 58, 47, 76, 64, 84, 72];
  return <section className="view-stack">
    <div className="metrics-grid">
      <MetricCard icon={CircleDollarSign} tone="green" label="مبيعات الشهر" value="12.6 مليون" foot="+14% عن الشهر السابق" />
      <MetricCard icon={TrendingUp} tone="gold" label="صافي الأرباح" value="2.9 مليون" foot="هامش ربح 23%" />
      <MetricCard icon={CreditCard} tone="blue" label="الديون النشطة" value="7.8 مليون" foot="31 حساباً نشطاً" />
      <MetricCard icon={Clock3} tone="red" label="أقساط متأخرة" value="275 ألف" foot="3 زبائن يحتاجون متابعة" />
    </div>
    <div className="stats-grid"><article className="panel chart-panel"><div className="panel-header"><div><h2>حركة المبيعات</h2><p>آخر سبعة أيام</p></div><span className="status success">+18.2%</span></div><div className="bar-chart">{bars.map((height, index) => <div className="bar-slot" key={index}><div className="bar" style={{ height: `${height}%` }}><span>{height * 18} ألف</span></div><small>{["خ", "ج", "س", "أ", "ن", "ث", "ر"][index]}</small></div>)}</div></article>
      <article className="panel category-panel"><div className="panel-header"><div><h2>المبيعات حسب التصنيف</h2><p>توزيع هذا الشهر</p></div></div><div className="donut"><div><strong>12.6</strong><span>مليون د.ع</span></div></div><ul className="legend"><li><i className="c1" /><span>أجهزة منزلية</span><b>46%</b></li><li><i className="c2" /><span>هواتف</span><b>29%</b></li><li><i className="c3" /><span>تبريد</span><b>17%</b></li><li><i className="c4" /><span>إكسسوارات</span><b>8%</b></li></ul></article>
    </div>
    <div className="panel insight"><div className="insight-icon"><LayoutDashboard /></div><div><h3>ملخص ذكي</h3><p>الأجهزة المنزلية هي الأعلى مبيعاً، بينما يحتاج مخزون الهواتف إلى إعادة تجهيز خلال هذا الأسبوع.</p></div></div>
  </section>;
}

export default App;
