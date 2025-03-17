# 万程ioa 认证系统

这是万程ioa应用的认证系统，包括登录、注册和忘记密码功能。系统设计现代化、年轻化，UI精美，适配所有手机尺寸。

## 功能特点

### 登录功能
- 支持使用手机号或7位ID登录
- 密码验证
- 记住登录状态
- 忘记密码链接

### 注册功能
- 头像上传（集成Cloudinary）
- 用户名验证（2-6个字符，不能有特殊字符）
- 手机号验证
- 验证码（随机4位数字或简单数学题）
- 密码和确认密码
- 自动生成唯一的7位数ID

### 忘记密码功能
- 通过手机号和邮箱验证身份
- 设置新密码
- 密码强度验证

## 技术栈

- 前端：HTML, CSS, JavaScript
- 后端：Node.js
- 数据库：Supabase
- 媒体存储：Cloudinary
- 部署：Railway (PWA)

## 文件结构

```
auth/
├── pages/
│   ├── login.html         # 登录页面
│   ├── register.html      # 注册页面
│   └── forgot-password.html # 忘记密码页面
├── components/
│   └── README.md          # 组件说明
├── styles/
│   └── auth.css           # 认证页面样式
├── utils/
│   └── auth.js            # 认证工具函数
└── README.md              # 本文档
```

## 顶部图片

认证页面顶部需要一张图片，具体要求如下：

- **文件名**: `auth-header.png`
- **路径**: `/public/images/auth-header.png`
- **尺寸**: 宽度100%，高度35vh（建议分辨率：1920x675px）
- **风格建议**: 
  - 现代化、年轻化的设计
  - 可以使用渐变色或简洁的图案
  - 建议使用蓝色系（与应用主色调#4a6cf7相协调）
  - 可以包含简单的图形元素，但不要太复杂
  - 确保在图片底部与卡片过渡自然

请将图片放置在指定位置，以确保认证页面正确显示。

## 使用方法

1. 确保已安装所有依赖
2. 配置 Supabase：
   ```javascript
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
   ```
3. 配置 Cloudinary：
   ```javascript
   const cloudinaryCloudName = 'YOUR_CLOUD_NAME';
   const cloudinaryUploadPreset = 'chat_app_preset';
   ```
4. 上传顶部图片到 `/public/images/auth-header.png`
5. 启动应用，访问认证页面

## 数据库结构

在 Supabase 中创建 `users` 表，包含以下字段：

- `id`: UUID (主键，由Supabase Auth生成)
- `user_id`: 字符串 (7位数唯一ID)
- `username`: 字符串 (用户名，2-6个字符)
- `phone`: 字符串 (手机号)
- `email`: 字符串 (邮箱)
- `avatar_url`: 字符串 (头像URL)
- `created_at`: 时间戳 (创建时间)

## 注意事项

- 页面设计为移动优先，适配所有手机尺寸
- 页面禁止缩放和水平滚动
- 使用毛玻璃效果增强视觉体验
- 所有表单都有实时验证
- 头像上传到Cloudinary，URL存储在Supabase
- 7位数ID是用户的唯一标识，登录时可以使用 