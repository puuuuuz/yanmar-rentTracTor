// ========================================
// AppSheet-Style JavaScript - User Registration
// ========================================

// API_URL is defined in script.js
// But I will use a placeholder or try to find it. 
// Step 2029 shows `url` in `carCheck2` but that looks like a different script?
// Let's use a function to fetch config or just hardcode if I find it.
// Actually, `script.js` usually has the API URL.

// Let's assume we need to define API_URL. 
// Based on `booking-list-script.js` (which I read before), it might adhere to `const API_URL` convention.
// I will reuse `exec` URL from `do post.js` context if possible, but I don't have it.
// Wait, `booking-list.html` imports `utils.js`. Maybe it's there?
// I'll search for API_URL in `booking-list-script.js`.

let userData = {};
let selectedUserId = null;

async function fetchUserData() {
    showLoading();
    try {
        if (typeof API === 'undefined') {
            throw new Error('API Router is not initialized.');
        }

        const result = await API.request('backendGetPendingUsers');
        console.log('API Response:', result);

        if (result.status === 'success') {
            userData = {}; // Clear mock
            if (result.data && Array.isArray(result.data)) {
                result.data.forEach(user => {
                    const title = user['User Type'] || user['Title'] || user['คำนำหน้า'] || '';
                    if (title && user.name && !user.name.startsWith(title)) {
                        user.fullName = `${title} ${user.name}`;
                    } else {
                        user.fullName = user.name || 'Unknown';
                    }
                    userData[user.id] = user;
                });
            }
            renderTable();
            updateCount();
        } else {
            console.error('Error fetching users:', result.message);
            alert('Failed to load user data: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('Cannot connect to server: ' + error.message);
    } finally {
        hideLoading();
    }
}

function renderTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    // Filter logic here if needed (search)

    Object.values(userData).forEach(data => {
        const tr = document.createElement('tr');
        tr.className = 'table-row';
        tr.onclick = () => showDetail(data.id);

        tr.innerHTML = `
            <td class="col-checkbox"><input type="checkbox" onclick="event.stopPropagation()"></td>
            <td>
                <span class="status-badge ${data.status === 'Confirmotp' ? 'status-wait' : 'status-pending'}">
                    <i class="fas ${data.status === 'Confirmotp' ? 'fa-key' : 'fa-clock'}"></i>
                    ${data.status}
                </span>
            </td>
            <td>${data.fullName}</td>
            <td>${data.phone}</td>
            <td class="text-mono">${data.lineId}</td>
            <td>${data.address}</td>
            <td>${data.province}</td>
            <td>${data.registeredDate}</td>
            <td><span class="serial-no">${data.notes}</span></td>
        `;
        tableBody.appendChild(tr);
    });
}

function showLoading() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">Loading data...</td></tr>';
}

function hideLoading() {
    // handled by renderTable
}

function updateCount() {
    const countSpan = document.querySelector('.record-count');
    if (countSpan) countSpan.textContent = `${Object.keys(userData).length} รายการ`;
}

// ... duplicate toggleSidebar, showDetail, closeDetail ... 
// I should keep them or rewrite if I want to be clean. 
// I'll rewrite the necessary parts.

// ========================================
// Sidebar Toggle
// ========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

// ========================================
// Show Detail Panel
// ========================================
function showDetail(userId) {
    const data = userData[userId];
    if (!data) return;

    selectedUserId = userId;

    document.querySelectorAll('.table-row').forEach(row => row.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    const masterView = document.querySelector('.master-view');
    masterView.classList.add('detail-open');

    const detailBody = document.getElementById('detailBody');
    // Using image if available
    let imgHtml = '';
    if (data.image1) {
        imgHtml += `<div style="margin-bottom:10px;"><img src="${data.image1}" style="max-width:100%; border-radius:8px;"></div>`;
    }
    if (data.image2) {
        imgHtml += `<div style="margin-bottom:10px;"><img src="${data.image2}" style="max-width:100%; border-radius:8px;"></div>`;
    }

    detailBody.innerHTML = `
        <div class="detail-section">
            <div class="detail-section-title">ข้อมูลผู้ลงทะเบียน</div>
            ${imgHtml}
            <div class="detail-field">
                <div class="detail-label">รหัสลงทะเบียน</div>
                <div class="detail-value">${data.id}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">ชื่อ-นามสกุล</div>
                <div class="detail-value">${data.fullName}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">เลขบัตรประชาชน</div>
                <div class="detail-value text-mono">${data.idCard}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">วันที่ลงทะเบียน</div>
                <div class="detail-value">${data.registeredDate}</div>
            </div>
        </div>

        <div class="detail-section">
            <div class="detail-section-title">ข้อมูลติดต่อ</div>
            <div class="detail-field">
                <div class="detail-label">เบอร์โทรศัพท์</div>
                <div class="detail-value">${data.phone}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">ที่อยู่</div>
                <div class="detail-value">${data.address}</div>
            </div>
        </div>
        
         <div class="detail-actions" style="margin-top: 20px; display: flex; gap: 10px;">
            <button onclick="approveUser()" class="btn-primary" style="flex:1; background-color: #28a745;">อนุมัติ</button>
            <button onclick="rejectUser()" class="btn-primary" style="flex:1; background-color: #dc3545;">ไม่อนุมัติ</button>
        </div>
    `;

    const detailPanel = document.getElementById('detailPanel');
    detailPanel.classList.add('open');
}

function closeDetail() {
    const detailPanel = document.getElementById('detailPanel');
    detailPanel.classList.remove('open');
    const masterView = document.querySelector('.master-view');
    masterView.classList.remove('detail-open');
    document.querySelectorAll('.table-row').forEach(row => row.classList.remove('selected'));
    selectedUserId = null;
}

// ========================================
// Action Buttons logic
// ========================================
// APP_SCRIPT_URL is replaced by global API_URL

async function approveUser() {
    if (!selectedUserId) {
        alert('กรุณาเลือกรายการที่ต้องการอนุมัติ');
        return;
    }
    if (!confirm(`ยืนยันการอนุมัติ (Verify) สำหรับผู้ใช้ ${selectedUserId}?`)) return;

    try {
        showLoading();
        const result = await API.request('approveUser', { uid: selectedUserId }, 'POST');
        console.log('Approve Result:', result);
        alert('ดำเนินการยืนยัน (Verify) เรียบร้อยแล้ว');
        closeDetail();
        fetchUserData(); // Refresh
    } catch (e) {
        console.error(e);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
        hideLoading();
    }
}

async function editUser() {
    if (!selectedUserId) {
        alert('กรุณาเลือกรายการที่ต้องการแก้ไข');
        return;
    }
    alert('ระบบกำลังเปิดหน้าแก้ไขใน AppSheet (ตัวอย่าง)');
    // Placeholder logic for editing
}

async function pendingUser() {
    if (!selectedUserId) {
        alert('กรุณาเลือกรายการที่ต้องการตั้งสถานะ Pending');
        return;
    }
    if (!confirm(`ตั้งสถานะเป็นรอดำเนินการ (Pending) สำหรับผู้ใช้ ${selectedUserId}?`)) return;

    try {
        showLoading();
        const result = await API.request('pendingUser', { uid: selectedUserId }, 'POST');
        console.log('Pending Result:', result);
        alert('เปลี่ยนสถานะเป็น Pending เรียบร้อยแล้ว');
        closeDetail();
        fetchUserData();
    } catch (e) {
        console.error(e);
        alert('เกิดข้อผิดพลาด');
    } finally {
        hideLoading();
    }
}

function deleteUser() {
    if (!selectedUserId) {
        alert('กรุณาเลือกรายการที่ต้องการลบ');
        return;
    }
    if (!confirm(`คุณต้องการลบข้อมูลผู้ใช้ ${selectedUserId} ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return;
    
    alert('ฟังก์ชันการลบข้อมูล (Delete) กำลังถูกตรวจสอบความปลอดภัยก่อนเปิดใช้งาน');
}

// Expose to window
window.approveUser = approveUser;
window.editUser = editUser;
window.pendingUser = pendingUser;
window.deleteUser = deleteUser;
window.closeDetail = closeDetail;
window.fetchUserData = fetchUserData;
window.toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed');
};


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('App Initialized');
    fetchUserData();
});

// Search Logic
const searchInput = document.querySelector('.search-box input');
if (searchInput) {
    searchInput.addEventListener('input', function (e) {
        // ... simple filter on existing table rows ...
        // Re-implement if needed or rely on existing structure
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.table-row').forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}
