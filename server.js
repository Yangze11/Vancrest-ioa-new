const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const pinyin = require('pinyin');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const isProduction = process.env.NODE_ENV === 'production';

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session 配置
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// 使用内存存储
const MemoryStore = session.MemoryStore;
sessionConfig.store = new MemoryStore();

app.use(session(sessionConfig));

// 静态文件服务
app.use(express.static(path.join(__dirname, '.')));

// 处理所有路由，返回主页
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'home', 'index.html'));
});

// 初始化 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 生成唯一邮箱
async function generateUniqueEmail(name) {
  // 获取拼音（不带声调）
  const pinyinName = pinyin(name, {
    style: pinyin.STYLE_NORMAL,
    heteronym: false
  }).flat();
  
  // 分离姓和名
  const lastName = pinyinName[0];
  const firstName = pinyinName.slice(1).join('');
  
  // 基本邮箱格式
  const baseEmail = `${firstName}.${lastName}@vancrest.fun`;
  
  try {
    // 检查邮箱是否已存在
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .ilike('email', `${firstName}.${lastName}%@vancrest.fun`);
    
    if (!existingUsers || existingUsers.length === 0) {
      return baseEmail;
    }
    
    // 如果存在，添加数字后缀
    return `${firstName}.${lastName}${existingUsers.length + 1}@vancrest.fun`;
  } catch (error) {
    console.error('生成邮箱时出错:', error);
    throw error;
  }
}

// 生成7位数字ID
async function generateUniqueUserId() {
  while (true) {
    const userId = Math.floor(1000000 + Math.random() * 9000000).toString();
    
    // 检查ID是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', userId)
      .single();
    
    if (!existingUser) {
      return userId;
    }
  }
}

// 注册路由
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, password, avatar } = req.body;
    
    // 验证必填字段
    if (!name || !phone || !password) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }
    
    // 验证姓名格式
    if (!/^[\u4e00-\u9fa5]{2,6}$/.test(name)) {
      return res.status(400).json({ error: '请输入2-6个汉字的真实姓名' });
    }
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }
    
    // 检查手机号是否已注册
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone);
    
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: '该手机号已被注册' });
    }
    
    // 生成唯一邮箱
    const email = await generateUniqueEmail(name);
    
    // 生成唯一用户ID
    const userId = await generateUniqueUserId();
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 插入用户数据
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          user_id: userId,
          name,
          phone,
          email,
          password: hashedPassword,
          avatar_url: avatar || null
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    // 生成欢迎消息
    const welcomeMessage = {
      sender_id: 'system', // 系统消息标识
      receiver_id: newUser.user_id,
      content: `您好${name}：\n感谢您注册万程ioa，在使用全部功能您需要先进行<a href="/onboarding" class="onboarding-link">入职申请</a>。\n万程乐娱人资与组织运营中心再次欢迎您的到来 😊`,
      created_at: new Date().toISOString()
    };
    
    // 存储系统消息
    await supabase
      .from('messages')
      .insert([welcomeMessage]);
    
    // 生成 JWT token
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: '注册成功',
      user: {
        id: newUser.id,
        user_id: newUser.user_id,
        name: newUser.name,
        phone: newUser.phone,
        email: newUser.email,
        avatar: newUser.avatar_url
      },
      token
    });
    
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录路由
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    // 验证必填字段
    if (!phone || !password) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }
    
    // 查找用户
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (findError || !users) {
      return res.status(401).json({ error: '账号或密码错误' });
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, users.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: '账号或密码错误' });
    }
    
    // 生成 JWT token
    const token = jwt.sign(
      { userId: users.id },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: '登录成功',
      user: {
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        avatar: users.avatar_url
      },
      token
    });
    
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 生成邮箱路由
app.post('/api/generate-email', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: '请提供姓名' });
    }
    
    const email = await generateUniqueEmail(name);
    res.json({ email });
    
  } catch (error) {
    console.error('生成邮箱失败:', error);
    res.status(500).json({ error: '生成邮箱失败，请稍后重试' });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: '服务器内部错误，请稍后重试' });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
  console.log(`服务器运行在端口 ${port}`);
});