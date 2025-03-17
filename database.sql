-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 删除依赖表（如果存在）
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_room_members CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 创建users表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(7) UNIQUE NOT NULL,
  employee_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(11) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  department VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 启用行级安全性
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建访问策略
CREATE POLICY "允许所有人查看用户信息" ON users
  FOR SELECT USING (true);

CREATE POLICY "允许用户注册" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许用户更新自己的信息" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "允许用户删除自己的账号" ON users
  FOR DELETE USING (auth.uid() = id);


-- 在users表之后添加messages表（约第24行）
-- 修正后的 messages 表（约第24行）
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id),  -- 关联用户表主键
    receiver_id UUID REFERENCES users(id), 
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT false
);

-- 调整访问策略（约第42行）
CREATE POLICY "允许用户查看自己的消息" ON messages
  FOR SELECT USING (receiver_id = (SELECT id FROM users WHERE user_id = current_setting('app.current_user_id')));
  
-- 插入系统用户
INSERT INTO users (id, user_id, employee_id, name, phone, email, department, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'SYSTEM', 'SYSTEM', 'System', '00000000000', 'system@vancrest.com', 'System', 'system');

CREATE POLICY "允许系统发送消息" ON messages
  FOR INSERT WITH CHECK (sender_id = '00000000-0000-0000-0000-000000000000');

-- 创建索引（文件末尾添加）
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);