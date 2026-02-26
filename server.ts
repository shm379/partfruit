import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("partfruit.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    price REAL,
    image TEXT,
    description TEXT,
    is_available BOOLEAN DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_phone TEXT,
    items TEXT,
    total_price REAL,
    address TEXT,
    latitude REAL,
    longitude REAL,
    payment_method TEXT,
    receipt_image TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial admin if empty
const adminCount = db.prepare("SELECT count(*) as count FROM admins").get() as { count: number };
if (adminCount.count === 0) {
  db.prepare("INSERT INTO admins (username, password) VALUES (?, ?)").run("admin", "partfruit2024");
}

// Seed initial data if empty
const categoryCount = db.prepare("SELECT count(*) as count FROM categories").get() as { count: number };
if (categoryCount.count === 0) {
  const categories = ["میوه", "آجیل و خشکبار", "محصولات ایرانی", "لبنیات", "نوشیدنی", "تن ماهی و کمپوت", "تنقلات", "ظروف یکبار مصرف", "شکلات"];
  const insertCat = db.prepare("INSERT INTO categories (name) VALUES (?)");
  categories.forEach(cat => insertCat.run(cat));

  const initialProducts = [
    { name: "انار درجه یک ایرانی", category: "میوه", price: 1.5, image: "https://picsum.photos/seed/pomegranate/400/400", description: "انار تازه و شیرین صادراتی" },
    { name: "تن ماهی تاپسی", category: "تن ماهی و کمپوت", price: 0.8, image: "https://picsum.photos/seed/tuna/400/400", description: "تن ماهی با کیفیت عالی" },
    { name: "پنیر سفید کاله", category: "لبنیات", price: 1.2, image: "https://picsum.photos/seed/cheese/400/400", description: "محصولات تازه کاله ایران" },
    { name: "چای نوستالژی ایرانی", category: "نوشیدنی", price: 2.5, image: "https://picsum.photos/seed/tea/400/400", description: "طعم اصیل چای ایرانی" },
    { name: "آجیل مخلوط ممتاز", category: "آجیل و خشکبار", price: 5.0, image: "https://picsum.photos/seed/nuts/400/400", description: "ترکیبی از بهترین مغزها" },
    { name: "چیپس و پفک ایرانی", category: "تنقلات", price: 0.5, image: "https://picsum.photos/seed/snacks/400/400", description: "تنقلات محبوب ایرانی" },
    { name: "آش رشته آماده", category: "محصولات ایرانی", price: 2.0, image: "https://picsum.photos/seed/ash/400/400", description: "آش رشته داغ و خوشمزه" },
    { name: "کمپوت گیلاس", category: "تن ماهی و کمپوت", price: 1.1, image: "https://picsum.photos/seed/cherry/400/400", description: "کمپوت میوه تازه" },
    { name: "ظرف یکبار مصرف ۵۰۰ گرمی", category: "ظروف یکبار مصرف", price: 0.2, image: "https://picsum.photos/seed/plastic/400/400", description: "ظروف با کیفیت برای بسته بندی" },
    { name: "شکلات کادویی ایرانی", category: "شکلات", price: 3.5, image: "https://picsum.photos/seed/chocolate/400/400", description: "بهترین برندهای شکلات ایرانی" }
  ];

  const insertProd = db.prepare("INSERT INTO products (name, category_id, price, image, description) VALUES (?, (SELECT id FROM categories WHERE name = ?), ?, ?, ?)");
  initialProducts.forEach(p => insertProd.run(p.name, p.category, p.price, p.image, p.description));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Auth Routes
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    const admin = db.prepare("SELECT * FROM admins WHERE username = ? AND password = ?").get(username, password);
    if (admin) {
      res.json({ success: true, token: "mock-admin-token" });
    } else {
      res.status(401).json({ success: false, message: "نام کاربری یا رمز عبور اشتباه است" });
    }
  });

  app.post("/api/auth/whatsapp-code", (req, res) => {
    const { phone } = req.body;
    // In a real app, you'd send a WhatsApp message here via an API like Twilio or UltraMsg
    console.log(`Sending WhatsApp code to ${phone}`);
    res.json({ success: true, message: "کد تایید به واتساپ شما ارسال شد (کد تستی: 1234)" });
  });

  app.post("/api/orders", (req, res) => {
    const { customer_phone, items, total_price, address, latitude, longitude, payment_method, receipt_image } = req.body;
    const info = db.prepare(`
      INSERT INTO orders (customer_phone, items, total_price, address, latitude, longitude, payment_method, receipt_image) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customer_phone, JSON.stringify(items), total_price, address, latitude, longitude, payment_method, receipt_image);
    res.json({ success: true, orderId: info.lastInsertRowid });
  });

  // Thawani Mock Integration
  app.post("/api/payments/thawani/session", (req, res) => {
    const { amount } = req.body;
    // In real Thawani integration, you'd call https://uatcheckout.thawani.om/api/v1/checkout/session
    res.json({ 
      success: true, 
      session_id: "thawani_" + Math.random().toString(36).substr(2, 9),
      checkout_url: "https://checkout.thawani.om/pay/mock_session" 
    });
  });

  app.get("/api/orders", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    res.json(orders);
  });

  // API Routes
  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    res.json(categories);
  });

  app.get("/api/products", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id
    `).all();
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { name, category_id, price, image, description } = req.body;
    const info = db.prepare("INSERT INTO products (name, category_id, price, image, description) VALUES (?, ?, ?, ?, ?)").run(name, category_id, price, image, description);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/products/:id", (req, res) => {
    const { name, category_id, price, image, description } = req.body;
    db.prepare("UPDATE products SET name = ?, category_id = ?, price = ?, image = ?, description = ? WHERE id = ?")
      .run(name, category_id, price, image, description, req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
