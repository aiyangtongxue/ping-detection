// 在文件开头添加地图初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化地图，默认显示世界地图视图
    map = L.map('mapContainer').setView([30, 104], 3); // 默认显示中国视角
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
});

async function pingWebsite() {
    const urlInput = document.getElementById('urlInput').value.trim();
    const resultContainer = document.getElementById('resultContainer');
    
    if (!urlInput) {
        showError('请输入要测速的网址！');
        return;
    }
    
    // 移除 www. 和 http:// https:// 以统一格式
    let cleanUrl = urlInput.replace(/^(https?:\/\/)?(www\.)?/, '');
    
    try {
        showLoading();
        
        const response = await fetch(`proxy.php?url=${encodeURIComponent(cleanUrl)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.text();
        console.log('API Response:', data); // 调试用
        
        if (data.includes('error') || data.trim() === '') {
            showError('无法获取该网站的测速数据，请检查网址是否正确。');
            return;
        }
        
        parseAndDisplayResults(data);
        resultContainer.classList.add('visible');
        
    } catch (error) {
        console.error('Error:', error);
        showError('网络请求失败，请检查网络连接或稍后重试！');
    } finally {
        hideLoading();
    }
}

function parseAndDisplayResults(data) {
    console.log('原始数据:', data); // 调试用
    
    const lines = data.split('\n');
    let results = {
        queryUrl: '--',
        ipAddress: '--',
        hostLocation: '--',
        slowest: '--',
        fastest: '--',
        average: '--'
    };
    
    lines.forEach(line => {
        line = line.trim();
        console.log('处理行:', line); // 调试用
        
        if (line.includes('查询数据')) {
            results.queryUrl = line.split(/[：:]/)[1]?.trim();
        } else if (line.includes('IP地址')) {
            results.ipAddress = line.split(/[：:]/)[1]?.trim();
        } else if (line.includes('主机地址')) {
            results.hostLocation = line.split(/[：:]/)[1]?.trim();
        } else if (line.includes('最慢')) {
            results.slowest = line.split(/[：:]/)[1]?.trim();
        } else if (line.includes('最快')) {
            results.fastest = line.split(/[：:]/)[1]?.trim();
        } else if (line.includes('平均')) {
            results.average = line.split(/[：:]/)[1]?.trim();
        }
    });

    // 更新UI
    document.getElementById('queryUrl').textContent = results.queryUrl || '--';
    document.getElementById('ipAddress').textContent = results.ipAddress || '--';
    document.getElementById('hostLocation').textContent = results.hostLocation || '--';
    document.getElementById('slowestPing').textContent = results.slowest || '--';
    document.getElementById('fastestPing').textContent = results.fastest || '--';
    document.getElementById('averagePing').textContent = results.average || '--';

    // 显示结果容器
    document.getElementById('resultContainer').classList.add('visible');
}

function updateUI(results) {
    const elements = {
        'queryUrl': '查询网址',
        'ipAddress': 'IP地址',
        'hostLocation': '主机地址',
        'slowest': '最慢响应',
        'fastest': '最快响应',
        'average': '平均响应'
    };

    for (const [id, label] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            const value = results[id] || '--';
            element.textContent = value;
            // 添加工具提示
            element.title = `${label}: ${value}`;
        }
    }
}

function showError(message) {
    const resultContainer = document.getElementById('resultContainer');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // 清除之前的错误信息
    const oldError = resultContainer.querySelector('.error-message');
    if (oldError) {
        oldError.remove();
    }
    
    resultContainer.prepend(errorDiv);
    resultContainer.classList.add('visible');
}

function showLoading() {
    const button = document.querySelector('button');
    button.disabled = true;
    button.innerHTML = '<span class="loading-spinner"></span> 测速中...';
}

function hideLoading() {
    const button = document.querySelector('button');
    button.disabled = false;
    button.innerHTML = '开始测速';
}

// 添加回车键触发测速功能
document.getElementById('urlInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        pingWebsite();
    }
});

// 添加输入验证
document.getElementById('urlInput').addEventListener('input', function(e) {
    const input = e.target;
    const value = input.value.trim();
    const isValid = /^[a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(value) || 
                   /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(value);
    
    input.classList.toggle('invalid', !isValid && value !== '');
});

let map = null;
let marker = null;

async function getCurrentIP() {
    try {
        const response = await fetch('ip.php');
        const data = await response.json();
        
        // 更新IP信息显示
        document.getElementById('currentIP').textContent = data.query || data.ip;
        if (data.status === 'success') {
            document.getElementById('ipLocation').textContent = `${data.country} ${data.city}`;
            
            // 如果已有标记，先移除
            if (marker) {
                map.removeLayer(marker);
            }

            // 创建自定义标记图标
            const customIcon = L.divIcon({
                className: 'custom-marker marker-pulse',
                html: '',
                iconSize: [15, 15]
            });

            // 添加新标记
            marker = L.marker([data.lat, data.lon], {icon: customIcon}).addTo(map);
            marker.bindPopup(`
                <strong>IP地址:</strong> ${data.query || data.ip}<br>
                <strong>位置:</strong> ${data.country} ${data.city}<br>
                <strong>ISP:</strong> ${data.isp || '未知'}
            `).openPopup();

            // 平滑地将地图中心移动到标记位置
            map.flyTo([data.lat, data.lon], 4, {
                duration: 2
            });
        } else {
            document.getElementById('ipLocation').textContent = '未知位置';
        }
    } catch (error) {
        console.error('获取IP信息失败:', error);
        document.getElementById('currentIP').textContent = '获取失败';
        document.getElementById('ipLocation').textContent = '获取失败';
    }
}

// 确保在窗口调整大小时更新地图大小
window.addEventListener('resize', () => {
    if (map) {
        map.invalidateSize();
    }
});

// 页面加载完成后获取IP信息
document.addEventListener('DOMContentLoaded', getCurrentIP); 