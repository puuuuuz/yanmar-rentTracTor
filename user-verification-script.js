// ========================================
// AppSheet-Style JavaScript - User Verification
// ========================================

// Mock Data
// Mock Data
// Global API URL is now defined in script.js

// Data Store
let verifiedUserData = {};
let selectedUserId = null;

// ========================================
// Fetch User Data from Google Sheets
// ========================================
async function fetchUserData() {
    const spinner = document.getElementById('loadingSpinner');
    const tableBody = document.getElementById('tableBody');

    try {
        if (spinner) spinner.style.display = 'flex';
        if (tableBody) tableBody.innerHTML = ''; // Clear table explicitly

        if (typeof API === 'undefined') {
            throw new Error('API Router not initialized.');
        }

        // Fetch Users and Reservations in parallel using APIRouter
        const [userResult, reservationResult] = await Promise.all([
            API.request('backendGetUsers'),
            API.request('backendGetAllReservations')
        ]);

        console.log('User Data:', userResult);
        console.log('Reservation Data:', reservationResult);

        if (userResult.status === 'success' && userResult.data) {
            // Process Reservations to count per UID
            const rentalCounts = {};
            if (reservationResult.data) {
                reservationResult.data.forEach(booking => {
                    const uid = booking['User ID'] || booking['UID'] || booking['id_user'] || booking[1];
                    if (uid) {
                        rentalCounts[uid] = (rentalCounts[uid] || 0) + 1;
                    }
                });
            }

            processUserData(userResult.data, rentalCounts);
            renderUserTable();

            document.querySelector('.record-count').textContent = `${userResult.data.length} รายการ`;
        } else {
            console.error('API Error:', userResult.message);
            alert('เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ' + userResult.message);
        }

    } catch (error) {
        console.error('Error fetching users:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

// Helper to format date
function formatDateThai(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date)) return dateStr;
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
}

function processUserData(data, rentalCounts = {}) {
    verifiedUserData = {};
    data.forEach(item => {
        const id = item['UID'] || `USER-${Math.random().toString(36).substr(2, 5)}`;
        const firstName = item['ชื่อ'] || '';
        const lastName = item['นามสกุล'] || '';
        const title = item['คำนำหน้า'] || '';
        const fullName = `${title}${firstName} ${lastName}`.trim();

        // Get Count
        const count = rentalCounts[id] || 0;

        // Image Keys - Try multiple variations
        const idCardImg = item['บัตรประชาชน'] || item['ID Card'] || item['id_card'] || '';
        const selfieImg = item['รูปถ่ายพร้อมบัตรประชาชน'] || item['Selfie'] || item['selfie'] || '';

        verifiedUserData[id] = {
            id: id,
            // Personal Info
            title: title,
            firstName: firstName,
            lastName: lastName,
            fullName: fullName || '-',
            birthDate: formatDateThai(item['วันเดือนปีเกิด']),
            idCard: item['เลขบัตรประจำตัวประชาชน'] || '-',
            email: item['อีเมล์'] || '-',
            mobile: item['เบอร์มือถือ'] || '-',
            homePhone: item['เบอร์โทรบ้าน'] || '-',

            // ID Card Address
            idAddress: item['ที่อยู่ตามบัตรประชาชน'] || '-',
            idSubDistrict: item['ตำบลตามบัตรประชาชน'] || '-',
            idDistrict: item['อำเภอตามบัตรประชาชน'] || '-',
            idProvince: item['จังหวัดตามบัตรประชาชน'] || '-',
            idZip: item['รหัสไปรษณีย์ตามบัตรประชาชน'] || '-',

            // Current Address
            currentAddress: item['ที่อยู่ปัจจุบัน'] || '-',
            currentSubDistrict: item['ตำบลปัจจุบัน'] || '-',
            currentDistrict: item['อำเภอปัจจุบัน'] || '-',
            currentProvince: item['จังหวัดปัจจุบัน'] || '-',
            currentZip: item['รหัสไปรษณีย์ปัจจุบัน'] || '-',

            // Images & Verification
            idCardImage: idCardImg,
            selfieImage: selfieImg,
            otp: item['OTP'] || '-',

            // System Status
            status: item['Status'] || 'Pending',
            statusStamp: item['Status stamp'] || '-',
            timestamp: formatDateThai(item['timestamp']),
            rawTimestamp: item['timestamp'], // Store raw for sorting
            remark: item['Remark'] || '-',

            // Calculated
            rentalCount: count
        };
    });
}

function renderUserTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    const users = Object.values(verifiedUserData).filter(user => {
        const s = (user.status || '').toLowerCase();
        return s !== 'pending' && s !== 'confirmotp';
    });

    // Sort by rawTimestamp descending (Newest first)
    users.sort((a, b) => {
        const dateA = new Date(a.rawTimestamp);
        const dateB = new Date(b.rawTimestamp);
        return dateB - dateA;
    });

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'table-row';
        tr.onclick = () => showDetail(user.id);

        let statusClass = 'status-pending';
        let statusIcon = 'fa-clock';
        const st = (user.status || '').toLowerCase();

        if (st === 'active' || st === 'approved' || st === 'verify') {
            statusClass = 'status-verify';
            statusIcon = 'fa-check-circle';
        } else if (st === 'suspended' || st === 'cancel' || st === 'rejected') {
            statusClass = 'status-cancel';
            statusIcon = 'fa-ban';
        } else if (st === 'pending' || st === 'wait') {
            statusClass = 'status-pending';
            statusIcon = 'fa-hourglass-half';
        }

        // Format Date
        let displayDate = user.timestamp;
        try {
            if (user.rawTimestamp && user.rawTimestamp !== '-') {
                const date = new Date(user.rawTimestamp);
                if (!isNaN(date)) {
                    displayDate = date.toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' });
                }
            }
        } catch (e) { }

        // Thumbnail Logic
        let thumbnailHtml = '<div style="width: 40px; height: 40px; background: #eee; border-radius: 4px;"></div>';
        if (user.selfieImage) {
            thumbnailHtml = `<img src="${user.selfieImage}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border);" alt="Selfie">`;
        } else if (user.idCardImage) {
            thumbnailHtml = `<img src="${user.idCardImage}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border);" alt="ID">`;
        }

        tr.innerHTML = `
            <td class="col-checkbox"><input type="checkbox" onclick="event.stopPropagation()"></td>
            <td>${thumbnailHtml}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    <i class="fas ${statusIcon}"></i>
                    ${user.status === 'Active' ? 'Verify' : user.status}
                </span>
            </td>
            <td class="text-mono">${user.id}</td>
            <td>${user.fullName}</td>
            <td>${user.mobile}</td>
            <td>${user.currentProvince}</td>
            <td><span class="serial-no" style="font-size: 14px;">${user.rentalCount} ครั้ง</span></td>
            <td>${displayDate}</td>
            <td><span class="text-secondary">${user.remark}</span></td>
        `;
        tableBody.appendChild(tr);
    });
}

// Auto-run
document.addEventListener('DOMContentLoaded', fetchUserData);

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
    const data = verifiedUserData[userId];
    if (!data) {
        console.error('User not found:', userId);
        return;
    }

    selectedUserId = userId;

    // Update selected row
    document.querySelectorAll('.table-row').forEach(row => {
        row.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    // Update master view margin
    const masterView = document.querySelector('.master-view');
    masterView.classList.add('detail-open');

    // Build detail content with Tabs (Compact Design like Booking List)
    const detailBody = document.getElementById('detailBody');
    detailBody.innerHTML = `
        <div class="detail-tabs">
            <div class="detail-tab active" onclick="switchTab('tab-general', this)">ข้อมูลทั่วไป</div>
            <div class="detail-tab" onclick="switchTab('tab-docs', this)">ที่อยู่ & เอกสาร</div>
        </div>

        <div id="tab-general" class="tab-content active">
            <div class="detail-grid">
                <div class="detail-field">
                    <div class="detail-label">UID</div>
                    <div class="detail-value text-mono">${data.id}</div>
                </div>
                <div class="detail-field">
                    <div class="detail-label">สถานะ</div>
                    <div class="detail-value">
                        <span class="status-badge ${data.status.toLowerCase() === 'active' ? 'status-verify' : 'status-pending'}" style="font-size: 10px; padding: 2px 8px;">
                            ${data.status === 'Active' ? 'Verify' : data.status}
                        </span>
                    </div>
                </div>
                <div class="detail-field full-width">
                    <div class="detail-label">ชื่อ-นามสกุล</div>
                    <div class="detail-value">${data.fullName}</div>
                </div>
                <div class="detail-field">
                    <div class="detail-label">เลขบัตร ปชช.</div>
                    <div class="detail-value">${data.idCard}</div>
                </div>
                <div class="detail-field">
                    <div class="detail-label">วันเกิด</div>
                    <div class="detail-value">${data.birthDate}</div>
                </div>
                <div class="detail-field">
                    <div class="detail-label">เบอร์มือถือ</div>
                    <div class="detail-value">${data.mobile}</div>
                </div>
                <div class="detail-field">
                    <div class="detail-label">เบอร์บ้าน</div>
                    <div class="detail-value">${data.homePhone}</div>
                </div>
                <div class="detail-field full-width">
                    <div class="detail-label">อีเมล</div>
                    <div class="detail-value">${data.email}</div>
                </div>
                <div class="detail-field">
                    <div class="detail-label">OTP</div>
                    <div class="detail-value text-mono">${data.otp}</div>
                </div>
                <div class="detail-field">
                    <div class="detail-label">วันที่สมัคร</div>
                    <div class="detail-value">${data.timestamp}</div>
                </div>
                <div class="detail-field full-width">
                    <div class="detail-label">หมายเหตุ</div>
                    <div class="detail-value">${data.remark}</div>
                </div>
            </div>
        </div>

        <div id="tab-docs" class="tab-content">
            <div class="detail-grid">
                 <div class="detail-field full-width">
                    <div class="detail-label">ที่อยู่ปัจจุบัน</div>
                    <div class="detail-value">${data.currentAddress}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                        ต.${data.currentSubDistrict} อ.${data.currentDistrict} จ.${data.currentProvince} ${data.currentZip}
                    </div>
                </div>
                <div class="detail-field full-width">
                    <div class="detail-label">ที่อยู่ตามบัตรประชาชน</div>
                    <div class="detail-value">${data.idAddress}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                        ต.${data.idSubDistrict} อ.${data.idDistrict} จ.${data.idProvince} ${data.idZip}
                    </div>
                </div>
                
                <div class="detail-field full-width" style="margin-top: 10px;">
                    <div class="detail-label">รูปถ่าย & บัตรประชาชน</div>
                    <div style="display: flex; gap: 10px; overflow-x: auto; padding-top: 8px;">
                        ${data.idCardImage ? `<a href="${data.idCardImage}" target="_blank"><img src="${data.idCardImage}" style="height: 80px; border-radius: 6px; border: 1px solid var(--border);"></a>` : '<span class="text-secondary" style="font-size:12px">- ไม่มีรูปบัตร -</span>'}
                        ${data.selfieImage ? `<a href="${data.selfieImage}" target="_blank"><img src="${data.selfieImage}" style="height: 80px; border-radius: 6px; border: 1px solid var(--border);"></a>` : '<span class="text-secondary" style="font-size:12px">- ไม่มีรูปเซลฟี่ -</span>'}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Open detail panel
    const detailPanel = document.getElementById('detailPanel');
    detailPanel.classList.add('open');
}

// Tab Switcher Function
function switchTab(tabId, tabElement) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all tabs
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Activate selected tab and content
    document.getElementById(tabId).classList.add('active');
    tabElement.classList.add('active');
}

// ========================================
// Close Detail Panel
// ========================================
function closeDetail() {
    const detailPanel = document.getElementById('detailPanel');
    detailPanel.classList.remove('open');

    const masterView = document.querySelector('.master-view');
    masterView.classList.remove('detail-open');

    // Deselect rows
    document.querySelectorAll('.table-row').forEach(row => {
        row.classList.remove('selected');
    });

    selectedUserId = null;
}

// ========================================
// Action Buttons
// ========================================
function viewUser() {
    if (!selectedUserId) {
        alert('กรุณาเลือกรายการที่ต้องการดู');
        return;
    }
    alert(`ดูรายละเอียด: ${selectedUserId}\n\nฟังก์ชันนี้จะแสดงข้อมูลแบบเต็ม`);
}

function editUser() {
    if (!selectedUserId) {
        alert('กรุณาเลือกรายการที่ต้องการแก้ไข');
        return;
    }
    alert(`แก้ไขข้อมูล: ${selectedUserId}\n\nฟังก์ชันนี้จะเปิดฟอร์มแก้ไขข้อมูล`);
}

async function verifyUser() {
    if (!selectedUserId) {
        alert('กรุณาเลือกรายการที่ต้องการยืนยัน');
        return;
    }
    const data = verifiedUserData[selectedUserId];
    if (data.status === 'Active') {
        alert('ผู้ใช้นี้ได้รับการยืนยัน (Verify) อยู่แล้ว');
        return;
    }
    if (confirm(`ต้องการยืนยัน (Verify) ผู้ใช้ ${selectedUserId} หรือไม่?`)) {
        try {
            SpinnerManager.show('กำลังดำเนินการยืนยัน...');
            const result = await API.request('approveUser', { uid: selectedUserId }, 'POST');
            console.log('Verify Result:', result);
            alert(`ยืนยันผู้ใช้ ${selectedUserId} เรียบร้อยแล้ว`);
            closeDetail();
            fetchUserData();
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการยืนยันผู้ใช้');
        } finally {
            SpinnerManager.hide();
        }
    }
}

async function suspendUser() {
    if (!selectedUserId) {
        alert('กรุณาเลือกรายการที่ต้องการระงับ/ยกเลิก');
        return;
    }
    const data = verifiedUserData[selectedUserId];
    if (data.status === 'Suspended' || data.status === 'Cancel') {
        alert('ผู้ใช้นี้ถูกระงับหรือยกเลิกอยู่แล้ว');
        return;
    }
    if (confirm(`ต้องการยกเลิก (Cancel) ผู้ใช้ ${selectedUserId} หรือไม่?`)) {
        try {
            SpinnerManager.show('กำลังดำเนินการยกเลิก...');
            const result = await API.request('rejectUser', { uid: selectedUserId }, 'POST');
            console.log('Cancel Result:', result);
            alert(`ยกเลิกผู้ใช้ ${selectedUserId} เรียบร้อยแล้ว`);
            closeDetail();
            fetchUserData();
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการยกเลิกผู้ใช้');
        } finally {
            SpinnerManager.hide();
        }
    }
}

async function pendingUser() {
    if (!selectedUserId) {
        alert('กรุณาเลือกรายการที่ต้องการตั้งสถานะ Pending');
        return;
    }
    if (confirm(`ต้องการตั้งสถานะเป็นรอดำเนินการ (Pending) สำหรับผู้ใช้ ${selectedUserId} หรือไม่?`)) {
        try {
            SpinnerManager.show('กำลังตั้งสถานะ Pending...');
            const result = await API.request('pendingUser', { uid: selectedUserId }, 'POST');
            console.log('Pending Result:', result);
            alert(`ตั้งสถานะ Pending สำหรับผู้ใช้ ${selectedUserId} เรียบร้อยแล้ว`);
            closeDetail();
            fetchUserData();
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
        } finally {
            SpinnerManager.hide();
        }
    }
}

async function editUser() {
    if (!selectedUserId) {
        alert('กรุณาเลือกรายการที่ต้องการแก้ไข');
        return;
    }
    alert('ระบบกำลังเปิดหน้าแก้ไขใน AppSheet (ตัวอย่าง)');
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
window.verifyUser = verifyUser;
window.editUser = editUser;
window.pendingUser = pendingUser;
window.deleteUser = deleteUser;
window.closeDetail = closeDetail;
window.fetchUserData = fetchUserData;
window.toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed');
};
window.switchTab = (tabId, element) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
};

// ========================================
// Search Functionality
// ========================================
const searchInput = document.querySelector('.search-box input');
if (searchInput) {
    searchInput.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('.table-row');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// ========================================
// Initialize
// ========================================
console.log('User Verification - AppSheet Style Loaded');
console.log('Total verified users:', Object.keys(verifiedUserData).length);
