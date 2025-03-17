// 初始化 Supabase 客户端
const supabaseUrl = 'https://dtojzqqcdlqxqiztynuf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0b2p6cXFjZGxxeHFpenR5bnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNTAwNzYsImV4cCI6MjA1NzYyNjA3Nn0.QkbVVzx12P578TDzLb80LLMjrldbMSc8UCrdDbw-j38';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// DOM 元素
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const messageTabs = document.querySelectorAll('.tab');
const messageList = document.querySelector('.message-list');

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
    console.log('页面开始加载...');
    
    // 检查登录状态
    const user = await checkAuth();
    console.log('当前用户:', user);
    
    if (!user) {
        console.log('用户未登录，跳转到登录页面');
        window.location.href = '/auth/pages/login.html';
        return;
    }

    // 显示登录成功提示
    showLoginSuccess();

    // 初始化消息列表
    console.log('开始初始化消息列表...');
    await initializeMessageList();

    // 设置导航切换事件
    setupNavigation();

    // 设置消息标签切换事件
    setupMessageTabs();
    
    console.log('页面加载完成');
});

// 显示登录成功提示
function showLoginSuccess() {
    Swal.fire({
        icon: 'success',
        title: '登录成功',
        text: '欢迎回来！',
        timer: 2000,
        showConfirmButton: false,
        position: 'top',
        toast: true
    });
}

// 设置导航切换
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 移除所有激活状态
            navItems.forEach(nav => nav.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));

            // 添加新的激活状态
            item.classList.add('active');
            const targetPage = document.getElementById(item.dataset.page);
            targetPage.classList.add('active');
        });
    });
}

// 设置消息标签切换
function setupMessageTabs() {
    messageTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            messageTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // 根据标签加载不同的消息列表
            loadMessages(tab.textContent === '消息' ? 'direct' : 'group');
        });
    });
}

// 初始化消息列表
async function initializeMessageList() {
    // 添加加载动画
    messageList.innerHTML = '<div class="loading-spinner"></div>';

    try {
        // 获取用户ID
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData || !userData.id) {
            throw new Error('用户数据无效');
        }

        console.log('正在加载系统消息...');
        // 获取系统消息
        const { data: systemMessages, error: systemError } = await supabase
            .from('system_messages')
            .select('*')
            .eq('user_id', userData.id)
            .order('created_at', { ascending: false });

        if (systemError) {
            console.error('加载系统消息失败:', systemError);
            throw systemError;
        }

        console.log('系统消息:', systemMessages);

        // 获取普通消息
        console.log('正在加载用户消息...');
        const { data: userMessages, error: messageError } = await supabase
            .from('messages')
            .select(`
                id,
                content,
                created_at,
                sender_id,
                sender:users!sender_id(name, avatar_url)
            `)
            .or(`sender_id.eq.${userData.id},receiver_id.eq.${userData.id}`)
            .order('created_at', { ascending: false })
            .limit(20);

        if (messageError) {
            console.error('加载用户消息失败:', messageError);
            throw messageError;
        }

        console.log('用户消息:', userMessages);

        // 合并并排序所有消息
        const allMessages = [
            ...(systemMessages || []).map(msg => ({
                ...msg,
                isSystem: true
            })),
            ...(userMessages || [])
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        console.log('所有消息:', allMessages);

        if (allMessages.length === 0) {
            showEmptyState();
            return;
        }

        // 渲染消息列表
        renderMessageList(allMessages);
    } catch (error) {
        console.error('Error loading messages:', error);
        messageList.innerHTML = '<div class="empty-state">加载失败，请稍后重试</div>';
    }
}

// 渲染消息列表
function renderMessageList(messages) {
    messageList.innerHTML = messages.map(message => {
        if (message.isSystem) {
            // 系统消息模板
            return `
                <div class="message-item system-message" data-message-id="${message.id}">
                    <div class="message-avatar system-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-name">${message.title}</span>
                            <span class="message-time">${formatTime(message.created_at)}</span>
                        </div>
                        <div class="message-preview">${message.content}</div>
                    </div>
                </div>
            `;
        } else {
            // 普通消息模板
            return `
                <div class="message-item" data-message-id="${message.id}">
                    <div class="message-avatar">
                        ${message.sender.avatar_url 
                            ? `<img src="${message.sender.avatar_url}" alt="${message.sender.name}">`
                            : '<i class="fas fa-user"></i>'}
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-name">${message.sender.name}</span>
                            <span class="message-time">${formatTime(message.created_at)}</span>
                        </div>
                        <div class="message-preview">${message.content}</div>
                    </div>
                </div>
            `;
        }
    }).join('');
}

// 在文件末尾添加消息点击处理
document.querySelector('.message-list').addEventListener('click', (e) => {
    const messageItem = e.target.closest('.message-item');
    if (messageItem) {
        const messageId = messageItem.dataset.messageId;
        // 处理系统消息点击
        if (messageItem.querySelector('.system-avatar')) {
            Swal.fire({
                title: '小Q助手',
                html: messageItem.querySelector('.message-preview').innerHTML,
                confirmButtonText: '前往入职申请',
                showCancelButton: true,
                cancelButtonText: '关闭'
            }).then((result) => {
                // 修改消息点击处理（约第124行）
                if (result.isConfirmed) {
                    // 使用应用内路由跳转
                    window.location.hash = '#/onboarding';
                    // 或者使用框架路由
                    // router.navigate('/onboarding'); 
                }
            });
        }
    }
});

// 显示空状态
function showEmptyState() {
    messageList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-comments"></i>
            <p>暂无消息</p>
        </div>
    `;
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 24小时内显示具体时间
    if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    // 一周内显示星期几
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        return '星期' + days[date.getDay()];
    }

    // 其他显示具体日期
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

// 检查认证状态
async function checkAuth() {
    try {
        // 检查本地存储中的登录状态
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userData = JSON.parse(localStorage.getItem('user'));

        if (!isLoggedIn || !userData) {
            throw new Error('未登录');
        }

        // 验证 Supabase 会话
        const { data: { user }, error: sessionError } = await supabase.auth.getUser();
        
        if (sessionError || !user) {
            throw new Error('会话已过期');
        }

        // 验证用户数据是否最新
        const { data: latestUserData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userData.id)
            .single();

        if (userError || !latestUserData) {
            throw new Error('获取用户数据失败');
        }

        // 更新本地存储中的用户数据
        localStorage.setItem('user', JSON.stringify(latestUserData));
        
        return latestUserData;
    } catch (error) {
        console.error('认证检查失败:', error);
        // 清除本地存储
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        return null;
    }
    // 在checkAuth函数返回前添加（约第214行）
    // 设置当前用户ID用于RLS策略
    await supabase.rpc('set_config', {
    'app.current_user_id': latestUserData.user_id 
    }, { head: true });
}