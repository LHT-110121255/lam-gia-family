import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import multer from "multer";
import webpush from "web-push";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

import { User } from "./models/User.js";
import { Post } from "./models/Post.js";
import { Event } from "./models/Event.js";
import { Message } from "./models/Message.js";
import { Transaction } from "./models/Transaction.js";
import { Checklist } from "./models/Checklist.js";
import { Place } from "./models/Place.js";
import { SplitBill } from "./models/SplitBill.js";
import { Album } from "./models/Album.js";
import { Milestone } from "./models/Milestone.js";
import { Poll } from "./models/Poll.js";
import { FamilyInfo } from "./models/FamilyInfo.js";
import { Room } from "./models/Room.js";
import { Notification } from "./models/Notification.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv theo môi trường NODE_ENV
const nodeEnv = process.env.NODE_ENV || "development";
const envFile =
  nodeEnv === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: path.resolve(__dirname, envFile) });
dotenv.config(); // fallback to default .env if missing

// JWT Configuration Secrets
const ACCESS_TOKEN_SECRET =
  process.env.JWT_SECRET || "family_hub_access_secret_key_2026_secure";
const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "family_hub_refresh_secret_key_2026_super_secure";
const ACCESS_TOKEN_EXPIRY = "2h";
const REFRESH_TOKEN_EXPIRY = "30d";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  }),
);
app.options("*", cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Upload Directory Setup
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "family-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

// Web-Push VAPID Setup
let vapidKeys;
try {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@familyhub.vn",
      vapidKeys.publicKey,
      vapidKeys.privateKey,
    );
  } else {
    throw new Error("No keys set in env");
  }
} catch (err) {
  vapidKeys = webpush.generateVAPIDKeys();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@familyhub.vn",
    vapidKeys.publicKey,
    vapidKeys.privateKey,
  );
}

const vapidPublicKey = vapidKeys.publicKey;

// Connect to MongoDB Atlas
const rawMongoUri =
  process.env.MONGODB_URI ||
  "mongodb+srv://lamhuetrungdev:Lht080103*26@cluster0.fscgeyo.mongodb.net/family_hub?retryWrites=true&w=majority";

// Format MongoDB URI safely (encode special characters in password if needed)
const MONGODB_URI = rawMongoUri.trim();

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB Atlas (family_hub)");
    try {
      await ensureDefaultAccounts();
      await ensureDefaultRooms();
    } catch (seedErr) {
      console.warn("Initial accounts/rooms check notice:", seedErr.message);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error(
      "👉 Gợi ý: Hãy kiểm tra mục 'Network Access' trên MongoDB Atlas và thêm IP '0.0.0.0/0' (Allow Access from Anywhere) để Render có thể kết nối.",
    );
  });

// Helper: Generate JWT Access & Refresh Tokens
function generateTokens(user) {
  const payload = {
    userId: user._id.toString(),
    username: user.username,
    role: user.role || "adult",
    isAdmin: !!user.isAdmin,
  };

  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(
    { userId: user._id.toString() },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );

  return { accessToken, refreshToken };
}

// Middleware: Authenticate JWT Access Token
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

  if (!token) {
    return res.status(401).json({
      error: "Yêu cầu đăng nhập (Thiếu Access Token)",
      code: "NO_TOKEN",
    });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.isActive === false) {
      return res.status(401).json({
        error: "Tài khoản không tồn tại hoặc đã bị khóa",
        code: "USER_INACTIVE",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Phiên đăng nhập đã hết hạn", code: "TOKEN_EXPIRED" });
    }
    return res.status(403).json({
      error: "Token không hợp lệ hoặc đã bị thay đổi",
      code: "INVALID_TOKEN",
    });
  }
}

// Middleware: Role-based Authorization (RBAC)
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Chưa xác thực danh tính" });
    }
    if (req.user.isAdmin) {
      return next();
    }
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      error: `Bạn không có quyền thực hiện thao tác này. Quyền yêu cầu: [${allowedRoles.join(", ")}]`,
    });
  };
}

// Helper: Broadcast Web Push Notification
async function sendPushNotificationToAll(title, body, payloadData = {}) {
  try {
    const users = await User.find({ "pushSubscriptions.0": { $exists: true } });
    const notifications = [];
    users.forEach((user) => {
      user.pushSubscriptions.forEach((sub) => {
        const payload = JSON.stringify({
          title,
          body,
          url: payloadData.url || "/",
          priority: payloadData.priority || "normal",
          tag: payloadData.tag || "family-alert",
        });
        notifications.push(
          webpush.sendNotification(sub, payload).catch((err) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              // Expired subscription, cleanup
              User.updateOne(
                { _id: user._id },
                { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } },
              ).exec();
            }
          }),
        );
      });
    });
    await Promise.all(notifications);
  } catch (err) {
    console.warn("sendPushNotificationToAll error:", err.message);
  }
}

// Helper: Create In-App Notification in MongoDB, Broadcast via Socket.io & Send Web Push
async function createAndSendAppNotification({
  recipientUserIds,
  senderId,
  senderName = '',
  senderAvatar = '',
  title,
  content,
  type = 'system',
  targetTab = 'home',
  targetId = '',
}) {
  try {
    let targetUsers = recipientUserIds;
    if (!targetUsers || targetUsers.length === 0) {
      const query = { isActive: { $ne: false } };
      if (senderId && mongoose.Types.ObjectId.isValid(senderId)) {
        query._id = { $ne: senderId };
      }
      const users = await User.find(query).select('_id');
      targetUsers = users.map((u) => u._id);
    }

    if (!targetUsers || targetUsers.length === 0) return [];

    const notifDocs = targetUsers.map((uid) => ({
      userId: uid,
      senderId: senderId && mongoose.Types.ObjectId.isValid(senderId) ? senderId : null,
      senderName,
      senderAvatar,
      title,
      content,
      type,
      targetTab,
      targetId,
      read: false,
    }));

    const insertedNotifs = await Notification.insertMany(notifDocs);

    insertedNotifs.forEach((notif) => {
      const payload = {
        id: notif._id.toString(),
        _id: notif._id.toString(),
        userId: notif.userId.toString(),
        senderId: notif.senderId ? notif.senderId.toString() : '',
        senderName: notif.senderName || '',
        senderAvatar: notif.senderAvatar || '',
        title: notif.title,
        content: notif.content,
        type: notif.type,
        targetTab: notif.targetTab,
        targetId: notif.targetId,
        read: notif.read,
        createdAt: notif.createdAt ? notif.createdAt.toISOString() : new Date().toISOString(),
      };

      io.to(`user-${notif.userId}`).emit('new_notification', payload);
      io.to('room-all').emit('new_notification', payload);
    });

    sendPushNotificationToAll(title, content, { url: `/?tab=${targetTab}` });

    return insertedNotifs;
  } catch (err) {
    console.error('Error creating app notification:', err);
    return [];
  }
}

// --- SEED DEFAULT ADMIN ACCOUNT ONLY ---
const DEFAULT_ACCOUNTS = [
  {
    username: "lamhuetrung",
    password: "Lht080103*",
    name: "Lâm Huệ Trung",
    relationship: "Con trai (con thứ)",
    role: "adult",
    gender: "male",
    birthDate: "08/01/2003",
    phone: "0763849007",
    generation: 2,
    jobTitle: "Lập trình viên",
    email: "namphongtctv@gmail.com",
    address: "số tre, Tiểu Cần, Vĩnh Long",
    isAdmin: true,
    approvalStatus: "approved",
    isActive: true,
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80",
    status: "Ở nhà",
  },
];

async function ensureDefaultAccounts() {
  try {
    for (const acc of DEFAULT_ACCOUNTS) {
      const exists = await User.findOne({ username: acc.username });
      if (!exists) {
        await User.create(acc);
      } else {
        // Đảm bảo các tài khoản mẫu luôn có approvalStatus = 'approved' và admin đúng quyền
        if (
          !exists.approvalStatus ||
          exists.approvalStatus !== "approved" ||
          exists.isAdmin !== acc.isAdmin
        ) {
          exists.approvalStatus = "approved";
          exists.isAdmin = acc.isAdmin;
          exists.isActive = true;
          await exists.save();
        }
      }
    }
  } catch (err) {
    console.error("Seed accounts error:", err);
  }
}

async function ensureDefaultRooms() {
  try {
    const count = await Room.countDocuments();
    if (count === 0) {
      const allUsers = await User.find({}, "_id username");
      const userIds = allUsers.map((u) => u._id.toString());
      await Room.create({
        name: "Đại Gia Đình Họ Lâm",
        type: "all",
        memberIds: userIds,
        description: "Phòng trò chuyện toàn gia đình sum vầy & yêu thương",
        lastMessage: "Chào mừng cả gia đình!",
        lastMessageTime: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      });
      console.log("✅ Seeded default chat room: Đại Gia Đình Họ Lâm");
    }
  } catch (err) {
    console.error("Seed rooms error:", err);
  }
}

// --- API ENDPOINTS ---

// 0. Health Check & Version API
app.get(["/api", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    service: "Family Hub Backend",
    authenticated: !!req.headers["authorization"],
    timestamp: new Date(),
  });
});

app.get("/api/version", (req, res) => {
  res.json({
    name: "Lâm Gia Family Hub Server",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    serverTime: new Date(),
  });
});

// 1. Image Upload Endpoint
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Không tìm thấy file tải lên" });
  }
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// 2. VAPID Key Public Endpoint
app.get("/api/push/vapid-key", (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

// 3. Register Push Subscription
app.post("/api/push/subscribe", async (req, res) => {
  const { userId, subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: "Subscription không hợp lệ" });
  }
  try {
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { pushSubscriptions: subscription },
      });
    }
    res.status(201).json({ message: "Đăng ký nhận thông báo thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Trigger Emergency SOS Alert
app.post("/api/safety/sos", async (req, res) => {
  const { userId, userName, location } = req.body;
  const alertTitle = `🚨 CẢNH BÁO KHẨN CẤP SOS!`;
  const alertBody = `${userName || "Thành viên"} vừa kích hoạt nút SOS khẩn cấp!`;

  io.emit("sos_alert", { userId, userName, location, timestamp: new Date() });
  await sendPushNotificationToAll(alertTitle, alertBody, {
    priority: "urgent",
    tag: "sos-alert",
  });

  res.json({ success: true, message: "Tín hiệu SOS đã phát tới cả gia đình" });
});

// ==========================================
// 5. AUTHENTICATION & AUTHORIZATION API
// ==========================================

// 5.1 Đăng nhập (Login)
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Vui lòng nhập Tên tài khoản / SĐT và Mật khẩu" });
  }

  try {
    const cleanUsername = username.trim().toLowerCase();

    // Tìm user theo username, số điện thoại hoặc email
    const user = await User.findOne({
      $or: [
        { username: cleanUsername },
        { phone: username.trim() },
        { email: cleanUsername },
      ],
    });

    if (!user) {
      return res
        .status(401)
        .json({ error: "Tài khoản hoặc mật khẩu không chính xác" });
    }

    // Kiểm tra trạng thái phê duyệt (Pending / Rejected)
    if (user.approvalStatus === "pending") {
      return res.status(403).json({
        error:
          "Tài khoản của bạn đang chờ Admin Lâm Huệ Trung phê duyệt. Vui lòng quay lại sau.",
        code: "PENDING_APPROVAL",
      });
    }

    if (user.approvalStatus === "rejected") {
      return res.status(403).json({
        error: "Tài khoản của bạn đã bị từ chối tham gia gia đình.",
        code: "ACCOUNT_REJECTED",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        error: "Tài khoản này đã bị khóa. Vui lòng liên hệ Admin gia đình.",
        code: "USER_INACTIVE",
      });
    }

    // So sánh mật khẩu băm bcrypt
    const isMatch = await user.comparePassword(password.trim());
    if (!isMatch) {
      return res
        .status(401)
        .json({ error: "Tài khoản hoặc mật khẩu không chính xác" });
    }

    // Phát sinh Token kép
    const { accessToken, refreshToken } = generateTokens(user);

    // Lưu refreshToken vào database session (giới hạn tối đa 10 phiên đăng nhập đồng thời)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeTokens = (user.refreshTokens || [])
      .filter((t) => t.createdAt > thirtyDaysAgo)
      .slice(-9);

    activeTokens.push({ token: refreshToken, createdAt: new Date() });
    user.refreshTokens = activeTokens;
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: "Đăng nhập thành công",
      user: user.toAuthJSON(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    res
      .status(500)
      .json({ error: "Đã xảy ra lỗi máy chủ trong quá trình đăng nhập" });
  }
});

// 5.2 Đăng ký (Register) - Trạng thái mặc định Chờ duyệt (pending)
app.post("/api/auth/register", async (req, res) => {
  const {
    username,
    password,
    name,
    relationship,
    role,
    gender,
    phone,
    email,
    birthDate,
    jobTitle,
    address,
    avatar,
  } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({
      error: "Vui lòng điền đầy đủ Tên tài khoản, Mật khẩu và Họ tên",
    });
  }

  const cleanUsername = username.trim().toLowerCase();

  if (cleanUsername.length < 3) {
    return res
      .status(400)
      .json({ error: "Tên tài khoản phải có ít nhất 3 ký tự" });
  }

  if (password.trim().length < 6) {
    return res
      .status(400)
      .json({ error: "Mật khẩu phải có độ dài từ 6 ký tự trở lên" });
  }

  try {
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({
        error: "Tên tài khoản này đã tồn tại, vui lòng chọn tên khác",
      });
    }

    if (phone && phone.trim()) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return res
          .status(400)
          .json({ error: "Số điện thoại này đã được đăng ký tài khoản" });
      }
    }

    const assignedRole = role || "adult";
    let generation = 2;
    if (assignedRole === "elder") generation = 1;
    else if (assignedRole === "child" || assignedRole === "teen")
      generation = 3;

    const newUser = new User({
      username: cleanUsername,
      password: password.trim(), // Sẽ được tự động băm bcrypt qua hook pre('save')
      name: name.trim(),
      relationship: relationship || "Thành viên",
      role: assignedRole,
      generation,
      gender: gender || "male",
      phone: phone ? phone.trim() : "",
      email: email ? email.trim().toLowerCase() : "",
      birthDate: birthDate || "",
      jobTitle: jobTitle || "",
      address: address || "số tre, Tiểu Cần, Vĩnh Long",
      avatar: avatar || undefined,
      isAdmin: false,
      approvalStatus: "pending", // Mặc định chờ duyệt
      isActive: true,
    });

    await newUser.save();

    // Thông báo cho Admin qua realtime socket hoặc push
    io.emit("new_member_registered", {
      id: newUser._id,
      name: newUser.name,
      username: newUser.username,
      relationship: newUser.relationship,
      approvalStatus: "pending",
      createdAt: newUser.createdAt,
    });

    res.status(201).json({
      success: true,
      pendingApproval: true,
      message:
        "Đăng ký tài khoản thành công! Hồ sơ của bạn đang chờ Admin Lâm Huệ Trung phê duyệt trước khi có thể đăng nhập.",
      user: newUser.toAuthJSON(),
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message || "Đăng ký thất bại" });
  }
});

// ==========================================
// 6. ADMIN USER MANAGEMENT APIS
// ==========================================

// 6.1 Lấy danh sách toàn bộ tài khoản (Admin)
app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password -refreshTokens")
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    console.error("Get admin users error:", err);
    res.status(500).json({ error: "Lỗi tải danh sách người dùng" });
  }
});

// 6.2 Phê duyệt tài khoản (Approve User)
app.post("/api/admin/users/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    user.approvalStatus = "approved";
    user.isActive = true;
    await user.save();

    io.emit("user_status_changed", {
      userId: user._id,
      approvalStatus: "approved",
      isActive: true,
    });

    res.json({
      success: true,
      message: `Đã phê duyệt thành viên ${user.name} tham gia gia đình`,
      user: user.toAuthJSON(),
    });
  } catch (err) {
    console.error("Approve user error:", err);
    res.status(500).json({ error: "Lỗi phê duyệt tài khoản" });
  }
});

// 6.3 Từ chối tài khoản (Reject User)
app.post("/api/admin/users/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    if (user.isAdmin || user.username === "lamhuetrung") {
      return res
        .status(400)
        .json({ error: "Không thể từ chối tài khoản Quản trị viên" });
    }
    user.approvalStatus = "rejected";
    await user.save();

    io.emit("user_status_changed", {
      userId: user._id,
      approvalStatus: "rejected",
    });

    res.json({
      success: true,
      message: `Đã từ chối tài khoản ${user.name}`,
      user: user.toAuthJSON(),
    });
  } catch (err) {
    console.error("Reject user error:", err);
    res.status(500).json({ error: "Lỗi từ chối tài khoản" });
  }
});

// 6.4 Khóa / Mở khóa tài khoản hoặc sửa thông tin (Toggle Active/Status)
app.patch("/api/admin/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, role, relationship, isAdmin } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    if (user.username === "lamhuetrung" && isActive === false) {
      return res
        .status(400)
        .json({ error: "Không thể vô hiệu hóa tài khoản Admin gốc" });
    }

    if (typeof isActive === "boolean") user.isActive = isActive;
    if (role) user.role = role;
    if (relationship) user.relationship = relationship;
    if (typeof isAdmin === "boolean" && user.username !== "lamhuetrung") {
      user.isAdmin = isAdmin;
    }

    await user.save();
    io.emit("user_status_changed", {
      userId: user._id,
      isActive: user.isActive,
      role: user.role,
      approvalStatus: user.approvalStatus,
    });

    res.json({
      success: true,
      message: "Cập nhật tài khoản thành công",
      user: user.toAuthJSON(),
    });
  } catch (err) {
    console.error("Update user status error:", err);
    res.status(500).json({ error: "Lỗi cập nhật tài khoản" });
  }
});

// 6.5 Xóa tài khoản vĩnh viễn (Delete User)
app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    if (user.isAdmin || user.username === "lamhuetrung") {
      return res
        .status(400)
        .json({ error: "Không thể xóa tài khoản Quản trị viên" });
    }

    await User.findByIdAndDelete(id);
    io.emit("user_deleted", { userId: id });

    res.json({
      success: true,
      message: `Đã xóa tài khoản ${user.name}`,
    });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Lỗi xóa tài khoản" });
  }
});

// 5.3 Làm mới Token (Refresh Token)
app.post("/api/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Thiếu Refresh Token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.isActive === false) {
      return res
        .status(401)
        .json({ error: "Tài khoản không tồn tại hoặc đã bị khóa" });
    }

    // Kiểm tra refreshToken có nằm trong danh sách token hợp lệ của User không
    const tokenExists = (user.refreshTokens || []).some(
      (t) => t.token === refreshToken,
    );
    if (!tokenExists) {
      return res
        .status(403)
        .json({ error: "Refresh Token không hợp lệ hoặc đã bị thu hồi" });
    }

    // Token rotation: Tạo cặp token mới
    const tokens = generateTokens(user);

    // Thay thế token cũ bằng token mới trong DB
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.token !== refreshToken,
    );
    user.refreshTokens.push({
      token: tokens.refreshToken,
      createdAt: new Date(),
    });
    await user.save();

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user.toAuthJSON(),
    });
  } catch (err) {
    return res
      .status(403)
      .json({ error: "Refresh Token đã hết hạn hoặc không hợp lệ" });
  }
});

// 5.4 Đăng xuất & Hủy session (Logout)
app.post("/api/auth/logout", async (req, res) => {
  const { refreshToken } = req.body;

  try {
    if (refreshToken) {
      const decoded = jwt.decode(refreshToken);
      if (decoded && decoded.userId) {
        await User.findByIdAndUpdate(decoded.userId, {
          $pull: { refreshTokens: { token: refreshToken } },
        });
      }
    }
    res.json({ message: "Đăng xuất thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.5 Lấy thông tin user hiện tại (Get Me)
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: req.user.toAuthJSON() });
});

// ==========================================
// 6. MEMBERS / USERS API
// ==========================================
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -refreshTokens")
      .sort({ createdAt: 1 });

    const mapped = users.map((u) => {
      const obj = u.toObject ? u.toObject() : u;
      return {
        ...obj,
        id: obj._id ? obj._id.toString() : obj.id,
        latitude: obj.location?.latitude !== undefined ? obj.location.latitude : obj.latitude,
        longitude: obj.location?.longitude !== undefined ? obj.location.longitude : obj.longitude,
        locationAddress: obj.location?.address || obj.address || '',
      };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật thông tin thành viên (Avatar, Tên, SĐT, Email, Vị trí, Địa chỉ...)
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Xóa các trường không được update trực tiếp qua endpoint này
    delete updates.password;
    delete updates.refreshTokens;

    const cleanId = (id || "").trim().toLowerCase();
    const aliasMap = {
      "member-trung": "lamhuetrung",
      "member-thuc": "lamhuethuc",
      "member-tri": "lamhuetri",
      "member-gam": "honggam",
    };
    const targetUsername = aliasMap[cleanId] || cleanId;

    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({
        $or: [
          { username: cleanId },
          { username: targetUsername },
        ],
      });
    }

    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    // Cập nhật vị trí nếu có
    if (
      updates.latitude !== undefined ||
      updates.longitude !== undefined ||
      updates.locationAddress !== undefined ||
      updates.address !== undefined
    ) {
      user.location = {
        latitude: typeof updates.latitude === 'number' ? updates.latitude : user.location?.latitude,
        longitude: typeof updates.longitude === 'number' ? updates.longitude : user.location?.longitude,
        address: updates.locationAddress || updates.address || user.location?.address || '',
        updatedAt: new Date(),
      };
    }

    // Cập nhật các trường thông tin khác
    const ignoreKeys = ['_id', 'id', 'password', 'refreshTokens'];
    Object.keys(updates).forEach((k) => {
      if (!ignoreKeys.includes(k) && updates[k] !== undefined) {
        user[k] = updates[k];
      }
    });

    await user.save();

    const sanitized = user.toAuthJSON ? user.toAuthJSON() : user.toObject();
    const responseData = {
      ...sanitized,
      id: user._id.toString(),
      latitude: user.location?.latitude,
      longitude: user.location?.longitude,
      locationAddress: user.location?.address,
    };

    // Phát sóng qua Socket.io để tất cả các tab và thiết bị cập nhật tức thì
    io.emit("member_updated", responseData);
    io.emit("member_location_updated", {
      userId: user._id.toString(),
      username: user.username,
      latitude: user.location?.latitude,
      longitude: user.location?.longitude,
      address: user.location?.address,
      batteryLevel: user.batteryLevel,
      onlineStatus: user.onlineStatus,
      updatedAt: new Date(),
    });

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6.1 FAMILY PLACES (BẢN ĐỒ ĐỊA ĐIỂM GIA ĐÌNH)
// ==========================================
app.get("/api/places", async (req, res) => {
  try {
    const places = await Place.find().sort({ createdAt: -1 });
    res.json(places);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/places", async (req, res) => {
  try {
    const place = new Place(req.body);
    await place.save();
    io.emit("new_place", place);
    res.status(201).json(place);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/places/:id", async (req, res) => {
  try {
    const place = await Place.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!place) {
      return res.status(404).json({ error: "Không tìm thấy địa điểm" });
    }
    io.emit("update_place", place);
    res.json(place);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/places/:id", async (req, res) => {
  try {
    const place = await Place.findByIdAndDelete(req.params.id);
    if (!place) {
      return res.status(404).json({ error: "Không tìm thấy địa điểm" });
    }
    io.emit("delete_place", req.params.id);
    res.json({ success: true, message: "Đã xóa địa điểm" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6.2 NOTIFICATIONS API (THÔNG BÁO GIA ĐÌNH)
// ==========================================
app.get("/api/notifications", async (req, res) => {
  try {
    const { userId } = req.query;
    let query = {};
    if (userId) {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        query = { $or: [{ userId }, { userId: null }] };
      }
    }
    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(100);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications", async (req, res) => {
  try {
    const { userId, senderId, senderName, senderAvatar, title, content, type, targetTab, targetId } = req.body;
    const notifs = await createAndSendAppNotification({
      recipientUserIds: userId ? [userId] : [],
      senderId,
      senderName,
      senderAvatar,
      title,
      content,
      type,
      targetTab,
      targetId,
    });
    res.status(201).json(notifs[0] || { success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/notifications/read-all", async (req, res) => {
  try {
    const { userId } = req.body;
    const query = userId && mongoose.Types.ObjectId.isValid(userId) ? { userId } : {};
    await Notification.updateMany(query, { read: true });
    res.json({ success: true, message: "Đã đánh dấu tất cả thông báo là đã đọc" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      const notif = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
      return res.json(notif);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Notification.findByIdAndDelete(id);
    }
    res.json({ success: true, message: "Đã xóa thông báo" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. POSTS / FEED API
// ==========================================
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const post = new Post(req.body);
    await post.save();
    io.emit("new_post", post);

    // Tạo thông báo in-app & push notification cho cả nhà khi có bài viết mới
    await createAndSendAppNotification({
      senderId: post.authorId,
      senderName: post.authorName,
      senderAvatar: post.authorAvatar,
      title: "Bài viết gia đình mới 📸",
      content: `${post.authorName || "Thành viên"} vừa đăng: "${(post.content || "").substring(0, 50)}..."`,
      type: "family",
      targetTab: "home",
      targetId: post._id ? post._id.toString() : "",
    });

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to find Post by ObjectId or localId
async function findPostSafe(id) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const p = await Post.findById(id);
    if (p) return p;
  }
  return await Post.findOne({ _id: id }).catch(() => null);
}

app.post("/api/posts/:id/like", async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({ error: "Thiếu memberId" });
    }
    const post = await findPostSafe(id);
    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }
    const hasLiked = (post.likes || []).includes(memberId);
    if (hasLiked) {
      post.likes = post.likes.filter((m) => m !== memberId);
    } else {
      post.likes = [...(post.likes || []), memberId];
    }
    await post.save();
    io.emit("post_updated", post);
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/posts/:id/comment", async (req, res) => {
  try {
    const { id } = req.params;
    const { authorId, authorName, authorAvatar, content } = req.body;
    if (!content || !content.trim()) {
      return res
        .status(400)
        .json({ error: "Nội dung bình luận không được để trống" });
    }
    const post = await findPostSafe(id);
    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }
    const newComment = {
      authorId,
      authorName: authorName || "Thành viên",
      authorAvatar: authorAvatar || "",
      content: content.trim(),
      createdAt: new Date(),
    };
    post.comments = [...(post.comments || []), newComment];
    await post.save();
    io.emit("post_updated", post);
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/posts/:id/comments/:commentId", async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res
        .status(400)
        .json({ error: "Nội dung bình luận không được để trống" });
    }
    const post = await findPostSafe(id);
    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }
    let found = false;
    post.comments = (post.comments || []).map((c) => {
      if (c._id?.toString() === commentId || c.id === commentId) {
        found = true;
        c.content = content.trim();
      }
      return c;
    });
    if (!found) {
      return res.status(404).json({ error: "Không tìm thấy bình luận" });
    }
    await post.save();
    io.emit("post_updated", post);
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/posts/:id/comments/:commentId", async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const post = await findPostSafe(id);
    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }
    post.comments = (post.comments || []).filter(
      (c) => c._id?.toString() !== commentId && c.id !== commentId,
    );
    await post.save();
    io.emit("post_updated", post);
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Post.findByIdAndDelete(id);
    } else {
      await Post.deleteOne({ _id: id });
    }
    io.emit("post_deleted", { postId: id });
    res.json({ success: true, message: "Đã xóa bài viết" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7.4 CHAT ROOMS API
// ==========================================

// Lấy danh sách các phòng chat
app.get("/api/rooms", async (req, res) => {
  try {
    const { userId } = req.query;
    let query = {};
    if (userId) {
      query = { $or: [{ type: "all" }, { memberIds: userId }, { createdById: userId }] };
    }
    const rooms = await Room.find(query).sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tạo phòng chat mới
app.post("/api/rooms", async (req, res) => {
  try {
    const roomData = req.body;
    const room = new Room({
      name: roomData.name || "Phòng trò chuyện mới",
      type: roomData.type || "custom",
      memberIds: roomData.memberIds || [],
      createdById: roomData.createdById,
      avatar: roomData.avatar || "",
      description: roomData.description || "",
      lastMessage: "Đã tạo phòng trò chuyện mới",
      lastMessageTime: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    });
    await room.save();
    io.emit("new_room", room);
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật thông tin phòng (Tên, Ảnh, Mô tả, Ghim)
app.put("/api/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { _id: id };
    const room = await Room.findOneAndUpdate(query, req.body, { new: true });
    if (!room) {
      return res.status(404).json({ error: "Không tìm thấy phòng chat" });
    }
    io.emit("update_room", room);
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm thành viên vào phòng
app.post("/api/rooms/:id/members", async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: "Không tìm thấy phòng chat" });
    }
    const updatedMembers = Array.from(new Set([...room.memberIds, ...(memberIds || [])]));
    room.memberIds = updatedMembers;
    await room.save();
    io.emit("update_room", room);
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa/Rời thành viên khỏi phòng
app.delete("/api/rooms/:id/members/:memberId", async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: "Không tìm thấy phòng chat" });
    }
    room.memberIds = room.memberIds.filter((m) => m !== memberId);
    await room.save();
    io.emit("update_room", room);
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa phòng chat
app.delete("/api/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Room.findByIdAndDelete(id);
    }
    io.emit("delete_room", { roomId: id });
    res.json({ success: true, message: "Đã xóa phòng chat" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy kho tài nguyên Media (ảnh, video, file, link) của phòng chat
app.get("/api/rooms/:id/media", async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await Message.find({ roomId: id }).select("mediaUrl mediaUrls text createdAt senderName senderAvatar");
    const mediaList = [];
    const linkList = [];

    messages.forEach((msg) => {
      if (msg.mediaUrl) {
        mediaList.push({ url: msg.mediaUrl, createdAt: msg.createdAt, senderName: msg.senderName });
      }
      if (msg.mediaUrls && msg.mediaUrls.length > 0) {
        msg.mediaUrls.forEach((url) => {
          mediaList.push({ url, createdAt: msg.createdAt, senderName: msg.senderName });
        });
      }
      if (msg.text) {
        const matches = msg.text.match(/(https?:\/\/[^\s]+)/g);
        if (matches) {
          matches.forEach((url) => {
            linkList.push({ url, text: msg.text, createdAt: msg.createdAt, senderName: msg.senderName });
          });
        }
      }
    });

    res.json({ media: mediaList, links: linkList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7.5 CHAT MESSAGES API
// ==========================================

// Lấy tin nhắn cũ của 1 phòng chat từ MongoDB
app.get("/api/messages/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .select("-__v");
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa tin nhắn theo ID (REST API fallback)
app.delete("/api/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID tin nhắn không hợp lệ" });
    }
    await Message.findByIdAndUpdate(id, {
      text: "Tin nhắn đã được thu hồi",
      isDeleted: true,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. CALENDAR EVENTS API
// ==========================================
app.get("/api/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1, createdAt: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/events", async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    io.emit("new_event", event);
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    const updated = await Event.findOneAndUpdate(query, req.body, {
      new: true,
    });
    if (updated) {
      io.emit("update_event", updated);
      res.json(updated);
    } else {
      res.status(404).json({ error: "Không tìm thấy sự kiện" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    await Event.findOneAndDelete(query);
    io.emit("delete_event", { eventId: id });
    res.json({ success: true, message: "Đã xóa sự kiện" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ==========================================
// 10. CHECKLISTS / TASKS API
// ==========================================
app.get("/api/checklists", async (req, res) => {
  try {
    const lists = await Checklist.find().sort({ createdAt: -1 });
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/checklists", async (req, res) => {
  try {
    const list = new Checklist(req.body);
    await list.save();
    io.emit("new_checklist", list);
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/checklists/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    const updated = await Checklist.findOneAndUpdate(query, req.body, {
      new: true,
    });
    if (updated) {
      io.emit("update_checklist", updated);
      res.json(updated);
    } else {
      res.status(404).json({ error: "Không tìm thấy danh sách việc" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/checklists/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    await Checklist.findOneAndDelete(query);
    io.emit("delete_checklist", { checklistId: id });
    res.json({ success: true, message: "Đã xóa danh sách" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/checklists/:id/items", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    const list = await Checklist.findOne(query);
    if (!list)
      return res.status(404).json({ error: "Không tìm thấy danh sách" });

    list.items.push(req.body);
    await list.save();
    io.emit("update_checklist", list);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/checklists/:listId/toggle/:itemId", async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    const query = mongoose.Types.ObjectId.isValid(listId)
      ? { _id: listId }
      : { id: listId };
    const list = await Checklist.findOne(query);
    if (!list)
      return res.status(404).json({ error: "Không tìm thấy danh sách" });

    const item = list.items.find(
      (i) => i.id === itemId || i._id?.toString() === itemId,
    );
    if (item) {
      item.completed = !item.completed;
      if (req.body.completedBy) item.completedBy = req.body.completedBy;
      if (req.body.completedAt) item.completedAt = req.body.completedAt;
      await list.save();
      io.emit("update_checklist", list);
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. FINANCE & TRANSACTIONS API
// ==========================================
app.get("/api/transactions", async (req, res) => {
  try {
    const txs = await Transaction.find().sort({ createdAt: -1 });
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const tx = new Transaction(req.body);
    await tx.save();
    io.emit("new_transaction", tx);
    res.status(201).json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    await Transaction.findOneAndDelete(query);
    io.emit("delete_transaction", { transactionId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 12. SPLIT BILLS API
// ==========================================
app.get("/api/split-bills", async (req, res) => {
  try {
    const bills = await SplitBill.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/split-bills", async (req, res) => {
  try {
    const bill = new SplitBill(req.body);
    await bill.save();
    io.emit("new_split_bill", bill);
    res.status(201).json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/split-bills/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    const updated = await SplitBill.findOneAndUpdate(query, req.body, {
      new: true,
    });
    if (updated) {
      io.emit("update_split_bill", updated);
      res.json(updated);
    } else {
      res.status(404).json({ error: "Không tìm thấy hóa đơn" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/split-bills/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    await SplitBill.findOneAndDelete(query);
    io.emit("delete_split_bill", { splitBillId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 13. ALBUMS & PHOTOS API
// ==========================================
app.get("/api/albums", async (req, res) => {
  try {
    const albums = await Album.find().sort({ createdAt: -1 });
    res.json(albums);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/albums", async (req, res) => {
  try {
    const album = new Album(req.body);
    await album.save();
    io.emit("new_album", album);
    res.status(201).json(album);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/albums/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    const updated = await Album.findOneAndUpdate(query, req.body, {
      new: true,
    });
    if (updated) {
      io.emit("update_album", updated);
      res.json(updated);
    } else {
      res.status(404).json({ error: "Không tìm thấy album" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/albums/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    await Album.findOneAndDelete(query);
    io.emit("delete_album", { albumId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/albums/:id/photos", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    const album = await Album.findOne(query);
    if (!album) return res.status(404).json({ error: "Không tìm thấy album" });

    const newPhotos = Array.isArray(req.body.photos)
      ? req.body.photos
      : [req.body];
    album.photos.push(...newPhotos);
    album.photoCount = album.photos.length;
    if (!album.coverUrl && newPhotos[0]?.url) {
      album.coverUrl = newPhotos[0].url;
    }
    await album.save();
    io.emit("update_album", album);
    res.json(album);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/albums/:id/photos/:photoId", async (req, res) => {
  try {
    const { id, photoId } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    const album = await Album.findOne(query);
    if (!album) return res.status(404).json({ error: "Không tìm thấy album" });

    album.photos = album.photos.filter(
      (p) => p.id !== photoId && p._id?.toString() !== photoId,
    );
    album.photoCount = album.photos.length;
    await album.save();
    io.emit("update_album", album);
    res.json(album);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 14. MILESTONES (DÒNG SỰ KIỆN) API
// ==========================================
app.get("/api/milestones", async (req, res) => {
  try {
    const milestones = await Milestone.find().sort({ year: -1, date: -1 });
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/milestones", async (req, res) => {
  try {
    const milestone = new Milestone(req.body);
    await milestone.save();
    io.emit("new_milestone", milestone);
    res.status(201).json(milestone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/milestones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    await Milestone.findOneAndDelete(query);
    io.emit("delete_milestone", { milestoneId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 15. POLLS (BÌNH CHỌN) API
// ==========================================
app.get("/api/polls", async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 });
    res.json(polls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/polls", async (req, res) => {
  try {
    const poll = new Poll(req.body);
    await poll.save();
    io.emit("new_poll", poll);
    res.status(201).json(poll);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/polls/:id/vote", async (req, res) => {
  try {
    const { id } = req.params;
    const { optionId, memberId } = req.body;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    const poll = await Poll.findOne(query);
    if (!poll)
      return res.status(404).json({ error: "Không tìm thấy bình chọn" });

    poll.options.forEach((opt) => {
      const isTarget = opt.id === optionId || opt._id?.toString() === optionId;
      const hasVoted = opt.voterIds.includes(memberId);
      if (isTarget) {
        if (hasVoted) {
          opt.voterIds = opt.voterIds.filter((v) => v !== memberId);
        } else {
          opt.voterIds.push(memberId);
        }
      } else if (!poll.allowMultiple) {
        opt.voterIds = opt.voterIds.filter((v) => v !== memberId);
      }
    });

    await poll.save();
    io.emit("update_poll", poll);
    res.json(poll);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/polls/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    await Poll.findOneAndDelete(query);
    io.emit("delete_poll", { pollId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 16. FAMILY INFO API
// ==========================================
app.get("/api/family-info", async (req, res) => {
  try {
    let info = await FamilyInfo.findOne();
    if (!info) {
      info = new FamilyInfo();
      await info.save();
    }
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/family-info", async (req, res) => {
  try {
    let info = await FamilyInfo.findOneAndUpdate({}, req.body, {
      upsert: true,
      new: true,
    });
    io.emit("update_family_info", info);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 17. ON THIS DAY (NGÀY NÀY NĂM XƯA) API
// ==========================================
app.get("/api/on-this-day", async (req, res) => {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    // 1. Tìm trong Posts có ảnh hoặc nội dung trùng ngày tháng các năm trước
    const allPosts = await Post.find().sort({ createdAt: -1 });
    for (const p of allPosts) {
      if (!p.createdAt) continue;
      const pDate = new Date(p.createdAt);
      if (
        pDate.getFullYear() < currentYear &&
        pDate.getMonth() + 1 === currentMonth &&
        pDate.getDate() === currentDay
      ) {
        return res.json({
          id: `otd-post-${p._id}`,
          yearsAgo: currentYear - pDate.getFullYear(),
          originalDate: p.createdAt.toISOString().split("T")[0],
          title: p.content ? p.content.substring(0, 50) : "Khoảnh khắc gia đình năm xưa",
          location: p.location || "",
          description: p.content || "",
          photos: p.mediaUrls || [],
          taggedMemberIds: p.authorId ? [p.authorId] : [],
        });
      }
    }

    // 2. Tìm trong Milestones
    const allMilestones = await Milestone.find().sort({ year: -1, date: -1 });
    for (const m of allMilestones) {
      let mMonth = 0;
      let mDay = 0;
      let mYear = m.year;

      if (m.date) {
        const parts = m.date.split("-");
        if (parts.length === 3) {
          mYear = parseInt(parts[0]);
          mMonth = parseInt(parts[1]);
          mDay = parseInt(parts[2]);
        }
      }

      if (mYear && mYear < currentYear && mMonth === currentMonth && mDay === currentDay) {
        return res.json({
          id: `otd-mile-${m._id}`,
          yearsAgo: currentYear - mYear,
          originalDate: m.date || `${mYear}-${String(currentMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`,
          title: m.title || "Kỷ niệm ngày này năm xưa",
          location: m.location || "",
          description: m.description || "",
          photos: m.photos || (m.coverUrl ? [m.coverUrl] : []),
          taggedMemberIds: m.taggedMemberIds || [],
        });
      }
    }

    // 3. Fallback: Nếu không có bài nào đúng ngày hôm nay của năm cũ, lấy kỷ niệm nổi bật gần nhất
    for (const m of allMilestones) {
      if (m.year && m.year < currentYear && (m.photos?.length > 0 || m.coverUrl)) {
        return res.json({
          id: `otd-mile-${m._id}`,
          yearsAgo: currentYear - m.year,
          originalDate: m.date || `${m.year}-01-01`,
          title: m.title || "Kỷ niệm đáng nhớ gia đình",
          location: m.location || "",
          description: m.description || "",
          photos: m.photos || (m.coverUrl ? [m.coverUrl] : []),
          taggedMemberIds: m.taggedMemberIds || [],
        });
      }
    }

    return res.json(null);
  } catch (err) {
    console.error("On this day error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Map to track active connected users: userId -> socketId
const connectedUserSockets = new Map();

io.on("connection", (socket) => {
  let socketUserId = null;

  socket.on("register_user", async (data) => {
    if (!data || !data.userId) return;
    socketUserId = data.userId;
    connectedUserSockets.set(data.userId, socket.id);
    socket.join(`user-${data.userId}`);

    try {
      if (mongoose.Types.ObjectId.isValid(data.userId)) {
        await User.findByIdAndUpdate(data.userId, { isActive: true });
      }
      io.emit("user_status_changed", {
        userId: data.userId,
        online: true,
      });
    } catch (err) {
      console.warn("Error updating user status on connect:", err.message);
    }
  });

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("typing", (data) => {
    if (!data || !data.roomId) return;
    socket.to(data.roomId).emit("user_typing", {
      roomId: data.roomId,
      userId: data.userId,
      name: data.name,
    });
  });

  socket.on("stop_typing", (data) => {
    if (!data || !data.roomId) return;
    socket.to(data.roomId).emit("user_stop_typing", {
      roomId: data.roomId,
      userId: data.userId,
    });
  });

  socket.on("read_message", async (data) => {
    try {
      const { roomId, messageId, userId } = data;
      if (messageId && mongoose.Types.ObjectId.isValid(messageId) && userId) {
        const updatedMsg = await Message.findByIdAndUpdate(
          messageId,
          { $addToSet: { readBy: userId } },
          { new: true }
        );
        if (updatedMsg) {
          io.to(roomId || "room-all").emit("message_read_updated", {
            roomId: roomId || "room-all",
            messageId,
            readBy: updatedMsg.readBy,
          });
        }
      }
    } catch (err) {
      console.error("Socket read_message error:", err);
    }
  });

  socket.on("send_message", async (data) => {
    try {
      const msg = new Message({
        roomId: data.roomId || "room-all",
        senderId: data.senderId,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar,
        text: data.text,
        mediaUrl: data.mediaUrl,
        isPriorityPing: !!data.isPriorityPing,
        readBy: data.readBy || [data.senderId],
      });
      await msg.save();

      const responsePayload = {
        ...msg.toObject(),
        id: msg._id.toString(),
        clientTempId: data.id || data.tempId,
        timestamp: data.timestamp || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      io.to(data.roomId || "room-all").emit("receive_message", responsePayload);

      if (data.isPriorityPing) {
        await sendPushNotificationToAll(
          `🔔 TIN NHẮN KHẨN TỪ ${data.senderName || "Người thân"}!`,
          data.text || "Gửi tín hiệu cần chú ý ngay!",
          { priority: "urgent", tag: "priority-ping" },
        );
      }
    } catch (err) {
      console.error("Socket send_message error:", err);
    }
  });

  socket.on("delete_message", async (data) => {
    try {
      const { roomId, messageId } = data;
      if (messageId && mongoose.Types.ObjectId.isValid(messageId)) {
        await Message.findByIdAndUpdate(messageId, { text: "Tin nhắn đã được thu hồi", isDeleted: true });
      }
      io.to(roomId || "room-all").emit("message_deleted", { roomId, messageId });
    } catch (err) {
      console.error("Socket delete_message error:", err);
    }
  });

  socket.on("message_reaction", async (data) => {
    try {
      const { roomId, messageId, emoji, memberId } = data;
      if (!messageId || !emoji || !memberId) return;

      if (mongoose.Types.ObjectId.isValid(messageId)) {
        const msg = await Message.findById(messageId);
        if (msg) {
          const existingIdx = (msg.reactions || []).findIndex(
            (r) => r.emoji === emoji && r.memberId === memberId
          );
          if (existingIdx >= 0) {
            msg.reactions.splice(existingIdx, 1);
          } else {
            if (!msg.reactions) msg.reactions = [];
            msg.reactions.push({ emoji, memberId });
          }
          await msg.save();
          io.to(roomId || "room-all").emit("message_reaction_updated", {
            roomId: roomId || "room-all",
            messageId,
            reactions: msg.reactions,
          });
        }
      }
    } catch (err) {
      console.error("Socket message_reaction error:", err);
    }
  });

  socket.on("pin_message", async (data) => {
    try {
      const { roomId, messageId, text } = data;
      if (!roomId) return;
      if (mongoose.Types.ObjectId.isValid(roomId)) {
        await Room.findByIdAndUpdate(roomId, {
          pinnedMessageId: messageId,
          pinnedMessageText: text,
        });
      }
      io.to(roomId || "room-all").emit("room_pinned_message", {
        roomId: roomId || "room-all",
        pinnedMessageId: messageId,
        pinnedMessageText: text,
      });
    } catch (err) {
      console.error("Socket pin_message error:", err);
    }
  });

  socket.on("unpin_message", async (data) => {
    try {
      const { roomId } = data;
      if (!roomId) return;
      if (mongoose.Types.ObjectId.isValid(roomId)) {
        await Room.findByIdAndUpdate(roomId, {
          pinnedMessageId: "",
          pinnedMessageText: "",
        });
      }
      io.to(roomId || "room-all").emit("room_pinned_message", {
        roomId: roomId || "room-all",
        pinnedMessageId: null,
        pinnedMessageText: null,
      });
    } catch (err) {
      console.error("Socket unpin_message error:", err);
    }
  });

  socket.on("update_location", async (data) => {
    try {
      const { userId, latitude, longitude, address } = data;
      const cleanId = (userId || "").trim().toLowerCase();
      const aliasMap = {
        "member-trung": "lamhuetrung",
        "member-thuc": "lamhuethuc",
        "member-tri": "lamhuetri",
        "member-gam": "honggam",
      };
      const targetUsername = aliasMap[cleanId] || cleanId;

      let user = null;
      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId);
      }
      if (!user) {
        user = await User.findOne({
          $or: [{ username: cleanId }, { username: targetUsername }],
        });
      }

      if (user) {
        user.location = {
          latitude: typeof latitude === "number" ? latitude : user.location?.latitude,
          longitude: typeof longitude === "number" ? longitude : user.location?.longitude,
          address: address || user.location?.address || "",
          updatedAt: new Date(),
        };
        await user.save();
      }

      io.emit("member_location_updated", {
        userId: user ? user._id.toString() : userId,
        username: user ? user.username : cleanId,
        latitude,
        longitude,
        address,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.warn("Socket update_location warning:", err.message);
    }
  });

  socket.on("disconnect", async () => {
    console.log("🔌 Client disconnected:", socket.id);
    if (socketUserId) {
      connectedUserSockets.delete(socketUserId);
      io.emit("user_status_changed", {
        userId: socketUserId,
        online: false,
        lastSeen: "Vừa xong",
      });
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  const isDev = process.env.NODE_ENV !== "production";
  console.log(`🚀 Lâm Gia Backend running on http://localhost:${PORT}`);
  console.log(
    `🛠️  Môi trường: ${isDev ? "DEVELOPMENT (Watch Mode)" : "PRODUCTION"}`,
  );
  console.log(`🔐 Authentication & RBAC Engine: Active`);
});
