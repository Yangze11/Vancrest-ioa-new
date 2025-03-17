// 认证相关工具函数

import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 生成随机验证码（4位数字或简单数学题）
export function generateCaptcha() {
  // 50%概率生成数字验证码，50%概率生成数学题
  if (Math.random() > 0.5) {
    // 生成4位数字验证码
    const code = Math.floor(1000 + Math.random() * 9000);
    return {
      type: 'number',
      code: code.toString(),
      display: code.toString()
    };
  } else {
    // 生成简单数学题
    const num1 = Math.floor(1 + Math.random() * 20);
    const num2 = Math.floor(1 + Math.random() * 10);
    const operators = ['+', '-', '×'];
    const operatorIndex = Math.floor(Math.random() * 2); // 只使用加减，乘法可能太难
    const operator = operators[operatorIndex];
    
    let answer;
    switch (operator) {
      case '+':
        answer = num1 + num2;
        break;
      case '-':
        // 确保结果为正数
        if (num1 < num2) {
          answer = num2 - num1;
          return {
            type: 'math',
            code: answer.toString(),
            display: `${num2} - ${num1} = ?`
          };
        }
        answer = num1 - num2;
        break;
      case '×':
        answer = num1 * num2;
        break;
      default:
        answer = num1 + num2;
    }
    
    return {
      type: 'math',
      code: answer.toString(),
      display: `${num1} ${operator} ${num2} = ?`
    };
  }
}

// 生成唯一的7位数ID
export async function generateUniqueId() {
  // 生成7位数ID的范围是1000000-9999999
  let id;
  let isUnique = false;
  
  while (!isUnique) {
    // 生成随机7位数
    id = Math.floor(1000000 + Math.random() * 9000000);
    
    // 检查ID是否已存在
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', id)
      .single();
    
    // 如果没有找到记录，说明ID是唯一的
    if (error && error.code === 'PGRST116') {
      isUnique = true;
    }
  }
  
  return id;
}

// 表单验证函数
export const validateForm = {
  // 用户名验证：2-6个字符，不能有特殊字符
  username: (value) => {
    if (!value) return '请输入用户名';
    if (value.length < 2 || value.length > 6) return '用户名长度应为2-6个字符';
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(value)) return '用户名不能包含特殊字符';
    return '';
  },
  
  // 手机号验证
  phone: (value) => {
    if (!value) return '请输入手机号';
    if (!/^1[3-9]\d{9}$/.test(value)) return '请输入有效的手机号';
    return '';
  },
  
  // 邮箱验证
  email: (value) => {
    if (!value) return '请输入邮箱';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '请输入有效的邮箱地址';
    return '';
  },
  
  // 密码验证：至少6位
  password: (value) => {
    if (!value) return '请输入密码';
    if (value.length < 6) return '密码长度至少为6位';
    return '';
  },
  
  // 确认密码验证
  confirmPassword: (value, password) => {
    if (!value) return '请确认密码';
    if (value !== password) return '两次输入的密码不一致';
    return '';
  },
  
  // 验证码验证
  captcha: (value, correctCaptcha) => {
    if (!value) return '请输入验证码';
    if (value !== correctCaptcha) return '验证码错误';
    return '';
  },
  
  // 账号验证（手机号或ID）
  account: (value) => {
    if (!value) return '请输入账号';
    // 如果是纯数字且为7位，视为ID
    if (/^\d{7}$/.test(value)) return '';
    // 否则视为手机号验证
    return validateForm.phone(value);
  }
};

// 上传图片到Cloudinary
export async function uploadImageToCloudinary(file) {
  if (!file) return null;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'chat_app_preset'); // 使用您在Cloudinary创建的上传预设
  
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/your-cloud-name/image/upload`, // 替换为您的cloud name
      {
        method: 'POST',
        body: formData
      }
    );
    
    const data = await response.json();
    
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error('上传失败');
    }
  } catch (error) {
    console.error('上传图片失败:', error);
    throw error;
  }
}

// 注册用户
export async function registerUser(userData) {
  try {
    // 1. 注册Supabase认证
    const { user, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });
    
    if (authError) throw authError;
    
    // 2. 生成唯一的7位数ID
    const userId = await generateUniqueId();
    
    // 3. 将用户信息存入数据库
    const { error: dbError } = await supabase
      .from('users')
      .insert([
        {
          id: user.id, // Supabase Auth ID
          user_id: userId, // 自定义7位数ID
          username: userData.username,
          phone: userData.phone,
          email: userData.email,
          avatar_url: userData.avatarUrl || null,
          created_at: new Date()
        }
      ]);
    
    if (dbError) throw dbError;
    
    return { success: true, userId };
  } catch (error) {
    console.error('注册失败:', error);
    return { success: false, error: error.message };
  }
}

// 登录
export async function loginUser(account, password) {
  try {
    let email;
    
    // 判断account是手机号还是ID
    if (/^\d{7}$/.test(account)) {
      // 如果是7位数ID，查询对应的邮箱
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', account)
        .single();
      
      if (error) throw error;
      email = data.email;
    } else {
      // 如果是手机号，查询对应的邮箱
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('phone', account)
        .single();
      
      if (error) throw error;
      email = data.email;
    }
    
    // 使用邮箱登录
    const { user, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (loginError) throw loginError;
    
    // 获取用户信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError) throw userError;
    
    return { success: true, user: userData };
  } catch (error) {
    console.error('登录失败:', error);
    return { success: false, error: error.message };
  }
}

// 重置密码
export async function resetPassword(account, newPassword) {
  try {
    let email;
    
    // 判断account是手机号还是ID
    if (/^\d{7}$/.test(account)) {
      // 如果是7位数ID，查询对应的邮箱
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', account)
        .single();
      
      if (error) throw error;
      email = data.email;
    } else {
      // 如果是手机号，查询对应的邮箱
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('phone', account)
        .single();
      
      if (error) throw error;
      email = data.email;
    }
    
    // 发送重置密码邮件
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    
    if (resetError) throw resetError;
    
    return { success: true };
  } catch (error) {
    console.error('重置密码失败:', error);
    return { success: false, error: error.message };
  }
}

// 更新密码
export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('更新密码失败:', error);
    return { success: false, error: error.message };
  }
} 