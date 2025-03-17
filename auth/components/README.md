# 万程ioa 认证组件

这个目录包含万程ioa应用的认证相关组件，包括登录、注册和忘记密码功能。

## 文件结构

- `pages/`: 包含认证页面
  - `login.html`: 登录页面
  - `register.html`: 注册页面
  - `forgot-password.html`: 忘记密码页面
- `styles/`: 包含样式文件
  - `auth.css`: 认证页面的样式
- `utils/`: 包含工具函数
  - `auth.js`: 认证相关的工具函数
- `components/`: 包含可复用的组件

## 图片资源

认证页面需要以下图片资源：

1. **顶部背景图片**:
   - 文件名: `auth-header.png`
   - 路径: `/public/images/auth-header.png`
   - 尺寸: 宽度100%，高度35vh
   - 建议分辨率: 1920x675px

请确保将图片放在正确的位置，以便页面能够正确加载。

## Supabase 配置

在使用这些认证页面之前，您需要：

1. 在 Supabase 中创建项目
2. 创建 `users` 表，包含以下字段：
   - `id`: UUID (主键，由Supabase Auth生成)
   - `user_id`: 字符串 (7位数唯一ID)
   - `username`: 字符串 (用户名，2-6个字符)
   - `phone`: 字符串 (手机号)
   - `email`: 字符串 (邮箱)
   - `avatar_url`: 字符串 (头像URL)
   - `created_at`: 时间戳 (创建时间)
3. 在认证页面中替换 Supabase URL 和 Anon Key

## Cloudinary 配置

对于头像上传功能，您需要：

1. 在 Cloudinary 中创建账户
2. 创建上传预设 (Upload Preset)，名称为 `chat_app_preset`
3. 在认证页面中替换 Cloudinary Cloud Name

## 使用方法

1. 确保已安装所有依赖
2. 配置 Supabase 和 Cloudinary
3. 上传必要的图片资源
4. 启动应用，访问认证页面

## 注意事项

- 这些页面设计为移动优先，适配所有手机尺寸
- 页面禁止缩放和水平滚动
- 注册成功后会生成唯一的7位数ID
- 登录支持使用手机号或7位数ID