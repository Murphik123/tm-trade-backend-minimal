const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB подключена'))
  .catch(err => console.error('Ошибка MongoDB:', err));

// ---------- Модели ----------
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  electronicKey: { type: String, default: '0000 0000 0000' },
  password: { type: String, required: true },
  role: { type: String, enum: ['buyer','seller','both','admin'], default: 'buyer' },
  avatar: { type: String, default: '' },
});
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
UserSchema.methods.matchPassword = async function(pwd) {
  return await bcrypt.compare(pwd, this.password);
};
const User = mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({
  name: String,
  retailPrice: Number,
  wholesalePrice: Number,
  image: String,
  category: { type: String, enum: ['food','light','construction','home'] },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});
const Product = mongoose.model('Product', ProductSchema);

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    purchaseType: { type: String, enum: ['retail','wholesale'] },
    quantity: { type: Number, default: 1 }
  }]
});
const Cart = mongoose.model('Cart', CartSchema);

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

const MailSchema = new mongoose.Schema({
  from: String,
  to: String,
  subject: String,
  body: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Mail = mongoose.model('Mail', MailSchema);

// ---------- Middleware для проверки токена ----------
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Нет токена' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Пользователь не найден' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Неверный токен' });
  }
};

// ---------- Маршруты ----------
// Регистрация
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, email, electronicKey, role, avatar } = req.body;
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) return res.status(400).json({ message: 'Пользователь уже существует' });
    const user = new User({ name, phone, email, electronicKey, role, avatar });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name, email, role, avatar } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Логин
app.post('/api/auth/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const user = await User.findOne({ $or: [{ email: login }, { phone: login }] });
    if (!user) return res.status(400).json({ message: 'Неверные данные' });
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Неверные данные' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name, email, role, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получение текущего пользователя
app.get('/api/auth/me', auth, (req, res) => res.json(req.user));

// Товары
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find(req.query.category ? { category: req.query.category } : {});
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/products', auth, async (req, res) => {
  try {
    const product = new Product({ ...req.body, sellerId: req.user._id });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/products/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Товар не найден' });
    Object.assign(product, req.body);
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/products/:id', auth, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Товар удалён' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Корзина
app.get('/api/cart', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    if (!cart) cart = new Cart({ userId: req.user._id, items: [] });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/cart/add', auth, async (req, res) => {
  try {
    const { productId, purchaseType, quantity } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Товар не найден' });
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) cart = new Cart({ userId: req.user._id, items: [] });
    const price = purchaseType === 'retail' ? product.retailPrice : product.wholesalePrice;
    const existing = cart.items.find(item => item.productId.toString() === productId && item.purchaseType === purchaseType);
    if (existing) existing.quantity += (quantity || 1);
    else cart.items.push({ productId, name: product.name, price, purchaseType, quantity: quantity || 1 });
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/cart/clear', auth, async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [] });
    res.json({ message: 'Корзина очищена' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Чат
app.get('/api/chat', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }]
    }).populate('senderId receiverId', 'name avatar');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/chat', auth, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const message = new Message({ senderId: req.user._id, receiverId, text });
    await message.save();
    await message.populate('senderId receiverId', 'name avatar');
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Почта
app.get('/api/mail/inbox', auth, async (req, res) => {
  try {
    const mails = await Mail.find({ to: req.user.email }).sort({ createdAt: -1 });
    res.json(mails);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/mail/send', auth, async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    const mail = new Mail({ from: req.user.email, to, subject, body });
    await mail.save();
    res.status(201).json({ message: 'Письмо отправлено' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/mail/read/:id', auth, async (req, res) => {
  try {
    await Mail.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Прочитано' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Корневой маршрут
app.get('/', (req, res) => res.send('API работает'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
