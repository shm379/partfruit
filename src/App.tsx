import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Settings, 
  Plus, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  ShoppingCart,
  CheckCircle2,
  Store,
  MapPin,
  Clock,
  Phone,
  LogIn,
  Map as MapIcon,
  MessageCircle,
  ClipboardList
} from 'lucide-react';
import { Category, Product, CartItem } from './types';

export default function App() {
  const [view, setView] = useState<'store' | 'admin' | 'cart' | 'admin-orders'>('store');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ username: '', password: '' });
  
  // Checkout states
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'thawani' | 'mobile'>('cod');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Admin states
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    const savedAdmin = localStorage.getItem('isAdmin');
    if (savedAdmin === 'true') setIsAdmin(true);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinalCheckout = async () => {
    if (!address) return alert('لطفا آدرس خود را وارد کنید');
    if (isVerifying && verificationCode !== '1234') return alert('کد تایید اشتباه است');
    if (paymentMethod === 'mobile' && !receiptImage) return alert('لطفا تصویر رسید واریز را آپلود کنید');

    let finalCheckoutUrl = '';
    if (paymentMethod === 'thawani') {
      const res = await fetch('/api/payments/thawani/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount })
      });
      const data = await res.json();
      finalCheckoutUrl = data.checkout_url;
    }

    const orderData = {
      customer_phone: customerPhone,
      items: cart,
      total_price: totalAmount,
      address,
      latitude: location?.lat,
      longitude: location?.lng,
      payment_method: paymentMethod,
      receipt_image: receiptImage
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (res.ok) {
      if (paymentMethod === 'thawani') {
        window.location.href = finalCheckoutUrl;
        return;
      }

      // Generate WhatsApp message
      const itemsText = cart.map(i => `${i.name} (${i.quantity} عدد)`).join('\n');
      const locationLink = location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : 'ثبت نشده';
      const paymentText = paymentMethod === 'cod' ? 'پرداخت در محل' : 'واریز موبایلی (رسید پیوست شد)';
      const message = `سفارش جدید از پارت فروت:\n\nمحصولات:\n${itemsText}\n\nجمع کل: ${totalAmount} ریال\nروش پرداخت: ${paymentText}\nآدرس: ${address}\nلوکیشن: ${locationLink}\nتلفن: ${customerPhone}`;
      
      const whatsappUrl = `https://wa.me/96800000000?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      setIsOrderComplete(true);
      setShowCheckout(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const method = editingProduct.id ? 'PUT' : 'POST';
    const url = editingProduct.id ? `/api/products/${editingProduct.id}` : '/api/products';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingProduct)
    });

    setEditingProduct(null);
    fetchData();
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('آیا از حذف این محصول مطمئن هستید؟')) {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-morphism px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center text-white">
            <Store size={24} />
          </div>
          <div onClick={() => setView('store')} className="cursor-pointer">
            <h1 className="font-bold text-lg text-brand-green">پارت فروت مسقط</h1>
            <p className="text-xs text-slate-500">Part Fruit Muscat</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin ? (
            <button 
              onClick={() => {
                fetchOrders();
                setView('admin-orders');
              }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
            >
              <ClipboardList size={22} />
            </button>
          ) : (
            <button 
              onClick={() => setShowAdminLogin(true)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
            >
              <LogIn size={22} />
            </button>
          )}
          <button 
            onClick={() => setView('cart')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative"
          >
            <ShoppingCart size={22} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        {view === 'store' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center text-center gap-1 border border-slate-100">
                <MapPin size={18} className="text-brand-green" />
                <span className="text-[10px] font-bold text-slate-400">آدرس</span>
                <span className="text-xs font-medium">مسقط، عمان</span>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center text-center gap-1 border border-slate-100">
                <Clock size={18} className="text-brand-green" />
                <span className="text-[10px] font-bold text-slate-400">ساعت کاری</span>
                <span className="text-xs font-medium">۸:۳۰ تا ۲۳:۳۰</span>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="جستجوی محصول..."
                className="w-full bg-white border border-slate-200 rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-brand-green focus:border-transparent outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button 
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${selectedCategory === null ? 'bg-brand-green text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                همه
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${selectedCategory === cat.id ? 'bg-brand-green text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map(product => (
                <motion.div 
                  layout
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col"
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-brand-green">
                      {product.category_name}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col flex-grow">
                    <h3 className="font-bold text-sm mb-1 line-clamp-1">{product.name}</h3>
                    <p className="text-[10px] text-slate-500 mb-3 line-clamp-2 leading-relaxed">{product.description}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-bold text-brand-green text-sm">{product.price} <span className="text-[10px]">ریال</span></span>
                      <button 
                        onClick={() => addToCart(product)}
                        className="bg-brand-green text-white p-2 rounded-xl hover:bg-brand-accent transition-colors shadow-sm"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'cart' && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setView('store')} className="p-2 hover:bg-slate-100 rounded-full">
                <ChevronRight size={24} />
              </button>
              <h2 className="text-xl font-bold">سبد خرید</h2>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <ShoppingBag size={40} />
                </div>
                <p className="text-slate-500">سبد خرید شما خالی است</p>
                <button 
                  onClick={() => setView('store')}
                  className="text-brand-green font-bold"
                >
                  بازگشت به فروشگاه
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-3">
                      <img src={item.image} className="w-20 h-20 rounded-xl object-cover" />
                      <div className="flex-grow">
                        <h4 className="font-bold text-sm mb-1">{item.name}</h4>
                        <p className="text-brand-green font-bold text-sm mb-2">{item.price} ریال</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-slate-100 rounded-lg px-2 py-1">
                            <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-600"><Trash2 size={16} /></button>
                            <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="text-brand-green"><Plus size={16} /></button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600">
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>جمع کل</span>
                    <span className="font-bold text-slate-900">{totalAmount.toFixed(2)} ریال</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>هزینه ارسال</span>
                    <span className="text-brand-green font-medium">رایگان (مسقط)</span>
                  </div>
                  <div className="h-px bg-slate-100 my-2" />
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-bold">مبلغ قابل پرداخت</span>
                    <span className="font-bold text-brand-green">{totalAmount.toFixed(2)} ریال</span>
                  </div>
                  <button 
                    onClick={() => setShowCheckout(true)}
                    className="w-full bg-brand-green text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-200 hover:bg-brand-accent transition-all active:scale-95"
                  >
                    تکمیل اطلاعات و پرداخت
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {view === 'admin' && isAdmin && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('store')} className="p-2 hover:bg-slate-100 rounded-full">
                  <ChevronRight size={24} />
                </button>
                <h2 className="text-xl font-bold">مدیریت محصولات</h2>
              </div>
              <button 
                onClick={() => setEditingProduct({ name: '', price: 0, category_id: categories[0]?.id, image: 'https://picsum.photos/400/400', description: '' })}
                className="bg-brand-green text-white p-2 rounded-xl shadow-md"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {products.map(p => (
                <div key={p.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                  <img src={p.image} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-grow">
                    <h4 className="font-bold text-sm">{p.name}</h4>
                    <p className="text-xs text-slate-500">{p.category_name} - {p.price} ریال</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingProduct(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Settings size={18} /></button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'admin-orders' && isAdmin && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setView('store')} className="p-2 hover:bg-slate-100 rounded-full">
                <ChevronRight size={24} />
              </button>
              <h2 className="text-xl font-bold">سفارشات دریافتی</h2>
            </div>
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-brand-green">سفارش #{order.id}</span>
                    <span className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="text-sm">
                    <p><strong>تلفن:</strong> {order.customer_phone}</p>
                    <p><strong>آدرس:</strong> {order.address}</p>
                    <p><strong>مبلغ:</strong> {order.total_price} ریال</p>
                    <p><strong>روش پرداخت:</strong> {order.payment_method === 'cod' ? 'در محل' : order.payment_method === 'thawani' ? 'آنلاین' : 'انتقال موبایلی'}</p>
                  </div>
                  {order.receipt_image && (
                    <div className="mt-2">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">تصویر رسید:</p>
                      <img src={order.receipt_image} className="w-full h-32 object-cover rounded-xl border border-slate-100" />
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    {order.latitude && (
                      <a 
                        href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                        target="_blank"
                        className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg"
                      >
                        <MapIcon size={14} /> مشاهده لوکیشن
                      </a>
                    )}
                    <a 
                      href={`https://wa.me/${order.customer_phone}`}
                      target="_blank"
                      className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-3 py-1 rounded-lg"
                    >
                      <MessageCircle size={14} /> تماس واتساپ
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 glass-morphism border-t border-slate-200 px-6 py-3 flex justify-around items-center z-50">
        <button 
          onClick={() => setView('store')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'store' ? 'text-brand-green' : 'text-slate-400'}`}
        >
          <Store size={24} />
          <span className="text-[10px] font-bold">فروشگاه</span>
        </button>
        <button 
          onClick={() => setView('cart')}
          className={`flex flex-col items-center gap-1 transition-colors relative ${view === 'cart' ? 'text-brand-green' : 'text-slate-400'}`}
        >
          <ShoppingCart size={24} />
          {cart.length > 0 && (
            <span className="absolute top-0 right-2 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {cart.length}
            </span>
          )}
          <span className="text-[10px] font-bold">سبد خرید</span>
        </button>
        <button 
          onClick={() => {
            if (isAdmin) setView('admin');
            else setShowAdminLogin(true);
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'admin' || view === 'admin-orders' ? 'text-brand-green' : 'text-slate-400'}`}
        >
          <Settings size={24} />
          <span className="text-[10px] font-bold">پنل مدیریت</span>
        </button>
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {showAdminLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">ورود به پنل مدیریت</h3>
                <button onClick={() => setShowAdminLogin(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="نام کاربری"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none"
                  value={adminCreds.username}
                  onChange={e => setAdminCreds({ ...adminCreds, username: e.target.value })}
                />
                <input 
                  type="password" 
                  placeholder="رمز عبور"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none"
                  value={adminCreds.password}
                  onChange={e => setAdminCreds({ ...adminCreds, password: e.target.value })}
                />
                <button className="w-full bg-brand-green text-white py-3 rounded-xl font-bold">ورود</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showCheckout && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end justify-center p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">تکمیل اطلاعات سفارش</h3>
                <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
              </div>
              
              <div className="space-y-6">
                {/* Phone & Verification */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">شماره همراه (واتساپ)</label>
                  <div className="flex gap-2">
                    <input 
                      type="tel" 
                      placeholder="مثلا 96812345678"
                      className="flex-grow bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      disabled={isVerifying}
                    />
                    {!isVerifying && (
                      <button 
                        onClick={handleSendWhatsAppCode}
                        className="bg-brand-green text-white px-4 rounded-xl text-xs font-bold"
                      >
                        ارسال کد
                      </button>
                    )}
                  </div>
                  {isVerifying && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="کد تایید (1234)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-center tracking-[1em]"
                        value={verificationCode}
                        onChange={e => setVerificationCode(e.target.value)}
                      />
                      <p className="text-[10px] text-slate-400 text-center">کد به واتساپ شما ارسال شد</p>
                    </motion.div>
                  )}
                </div>

                {/* Address & Location */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">آدرس دقیق جهت ارسال</label>
                  <textarea 
                    placeholder="نام محله، خیابان، پلاک و ..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none h-24 resize-none"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                  <button 
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${location ? 'border-brand-green text-brand-green bg-green-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <MapIcon size={18} />
                    {isGettingLocation ? 'در حال دریافت...' : location ? 'موقعیت مکانی ثبت شد' : 'ثبت موقعیت مکانی (GPS)'}
                  </button>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">روش پرداخت</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-3 rounded-xl border-2 text-[10px] font-bold flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cod' ? 'border-brand-green bg-green-50 text-brand-green' : 'border-slate-100 text-slate-400'}`}
                    >
                      <Store size={20} />
                      در محل
                    </button>
                    <button 
                      onClick={() => setPaymentMethod('thawani')}
                      className={`p-3 rounded-xl border-2 text-[10px] font-bold flex flex-col items-center gap-2 transition-all ${paymentMethod === 'thawani' ? 'border-brand-green bg-green-50 text-brand-green' : 'border-slate-100 text-slate-400'}`}
                    >
                      <LogIn size={20} />
                      آنلاین (Thawani)
                    </button>
                    <button 
                      onClick={() => setPaymentMethod('mobile')}
                      className={`p-3 rounded-xl border-2 text-[10px] font-bold flex flex-col items-center gap-2 transition-all ${paymentMethod === 'mobile' ? 'border-brand-green bg-green-50 text-brand-green' : 'border-slate-100 text-slate-400'}`}
                    >
                      <Phone size={20} />
                      انتقال موبایلی
                    </button>
                  </div>

                  {paymentMethod === 'mobile' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        لطفا مبلغ را به شماره <span className="font-bold text-brand-green">96812345678</span> واریز کرده و تصویر رسید را آپلود کنید.
                      </p>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className={`w-full py-4 border-2 border-dashed rounded-xl flex flex-col items-center gap-2 ${receiptImage ? 'border-brand-green bg-green-50' : 'border-slate-300'}`}>
                          {receiptImage ? (
                            <img src={receiptImage} className="w-20 h-20 object-cover rounded-lg" />
                          ) : (
                            <>
                              <Plus size={24} className="text-slate-400" />
                              <span className="text-[10px] text-slate-500 font-bold">آپلود تصویر رسید</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleFinalCheckout}
                    className="w-full bg-brand-green text-white py-4 rounded-2xl font-bold text-lg shadow-lg"
                  >
                    تایید و ارسال به واتساپ
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {editingProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{editingProduct.id ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h3>
                <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">نام محصول</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-brand-green"
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">قیمت (ریال)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-brand-green"
                      value={editingProduct.price}
                      onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">دسته بندی</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-brand-green"
                      value={editingProduct.category_id}
                      onChange={e => setEditingProduct({ ...editingProduct, category_id: parseInt(e.target.value) })}
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">لینک تصویر</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-brand-green"
                    value={editingProduct.image}
                    onChange={e => setEditingProduct({ ...editingProduct, image: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">توضیحات</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-brand-green h-24 resize-none"
                    value={editingProduct.description}
                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </div>
                <button className="w-full bg-brand-green text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-200">
                  ذخیره تغییرات
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {isOrderComplete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] bg-brand-green flex items-center justify-center p-6 text-white text-center"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6"
            >
              <CheckCircle2 size={100} className="mx-auto" />
              <h2 className="text-3xl font-bold">سفارش شما ثبت شد!</h2>
              <p className="text-lg opacity-90">همکاران ما به زودی با شما تماس خواهند گرفت.</p>
              <button 
                onClick={() => {
                  setCart([]);
                  setIsOrderComplete(false);
                  setView('store');
                }}
                className="bg-white text-brand-green px-10 py-4 rounded-2xl font-bold text-lg shadow-xl"
              >
                بازگشت به خانه
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
