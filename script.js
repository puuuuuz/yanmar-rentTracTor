// ========================================
// Global Configuration
// ========================================
// 🛡️ API URL is now securely managed by APIRouter (api-router.js) and Vercel Proxy
// SpinnerManager is now globally available via api-router.js


// ========================================
// Centralized Application Initialization
// ========================================
const App = {
    /**
     * Initialize Application Page
     * @param {Function} pageLogicCallback - Function containing page-specific logic
     */
    init: async function (pageLogicCallback) {
        console.log('🚀 App Initializing...');

        // 1. Check Auth (Skip if on login page)
        if (!window.location.pathname.includes('login.html')) {
            if (typeof Auth !== 'undefined' && !Auth.checkAuth()) {
                return; // Auth.checkAuth() redirects if failed
            }
        }

        // 2. Show Global Spinner
        SpinnerManager.show('กำลังเตรียมข้อมูล...');

        try {
            // 3. Initialize Shared Components
            this.initSidebar();
            this.updateUserProfile();

            // 4. Run Page Specific Logic
            if (typeof pageLogicCallback === 'function') {
                console.log('📌 Running Page Logic...');
                await pageLogicCallback();
            }

        } catch (error) {
            console.error('❌ App Init Error:', error);
            alert('เกิดข้อผิดพลาดในการโหลดระบบ: ' + error.message);
        } finally {
            // 5. Hide Global Spinner
            // Delay slightly to ensure smooth transition
            setTimeout(() => {
                SpinnerManager.hide();
                console.log('✅ App Ready');
            }, 500);
        }
    },

    initSidebar: function () {
        // Restore collapse state
        if (window.innerWidth > 768) {
            const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
            const sidebar = document.getElementById('sidebar');
            if (sidebar && isCollapsed) {
                sidebar.classList.add('collapsed');
                document.body.classList.add('sidebar-collapsed');
            }
        }

        // Highlight active menu based on current URL
        const path = window.location.pathname;
        document.querySelectorAll('.nav-item').forEach(item => {
            const href = item.getAttribute('href');
            if (href && path.includes(href)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Add Logout if not present
        const nav = document.querySelector('.sidebar-nav');
        if (nav && !document.getElementById('logout-btn')) {
            const logoutDivider = document.createElement('div');
            logoutDivider.className = 'nav-section';
            logoutDivider.style.marginTop = 'auto'; // push to bottom if flex layout allows
            logoutDivider.style.paddingTop = '1rem';
            logoutDivider.style.borderTop = '1px solid var(--border-color, #e0e0e0)';

            const logoutLink = document.createElement('a');
            logoutLink.href = '#';
            logoutLink.className = 'nav-item text-danger';
            logoutLink.id = 'logout-btn';
            logoutLink.innerHTML = `
                <i class="fas fa-sign-out-alt"></i>
                <span>ออกจากระบบ</span>
            `;

            // Allow styling color overrides
            logoutLink.style.color = '#dc3545';

            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
                    if (typeof Auth !== 'undefined') {
                        Auth.logout();
                    }
                }
            });

            nav.appendChild(logoutDivider);
            nav.appendChild(logoutLink);
        }
    },

    updateUserProfile: function () {
        if (typeof Auth === 'undefined') return;

        const user = Auth.getUser();
        if (!user) return;

        // 1. Find Avatar (Try ID first, then class)
        let avatar = document.getElementById('userProfileBtn') || document.querySelector('.user-avatar');
        if (!avatar) return;

        // Update initial
        avatar.textContent = (user.name || user.username || 'A').charAt(0).toUpperCase();

        // 2. Ensure Avatar is wrapped in a relative container for dropdown positioning
        let container = avatar.parentElement;
        if (getComputedStyle(container).position !== 'relative') {
            container.style.position = 'relative';
        }

        // 3. Find or Create Dropdown Menu
        let dropdownMenu = document.getElementById('profileDropdown');
        if (!dropdownMenu) {
            console.log('🏗️ Injecting Profile Dropdown...');
            dropdownMenu = document.createElement('div');
            dropdownMenu.id = 'profileDropdown';
            dropdownMenu.className = 'profile-dropdown-menu';
            dropdownMenu.innerHTML = `
                <div class="profile-dropdown-header">
                    <div class="profile-dropdown-name" id="profileDropdownName">${user.name || user.username}</div>
                    <div class="profile-dropdown-role" id="profileDropdownRole">${user.role === 'admin' ? 'Administrator' : 'User'}</div>
                </div>
                <div class="profile-dropdown-item logout" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>ออกจากระบบ (Logout)</span>
                </div>
            `;
            container.appendChild(dropdownMenu);
        }

        // 4. Bind Toggle Event
        // Remove old listener if any (by cloning or just overwriting property)
        avatar.onclick = (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('active');
        };

        // 5. Bind Logout Event
        const logoutBtn = dropdownMenu.querySelector('#logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
                    Auth.logout();
                }
            };
        }

        // 6. Global Click to Close
        document.addEventListener('click', (e) => {
            if (!avatar.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('active');
            }
        });

        console.log('👤 User Profile System Initialized');
    },

    /**
     * Show/Hide Global Spinner
     * @param {boolean} isLoading 
     */
    showLoading: function (isLoading) {
        if (isLoading) {
            SpinnerManager.show();
        } else {
            SpinnerManager.hide();
        }
    }
};
window.App = App;

// Page Navigation
function showPage(pageId, element) {
    try {
        console.log('Navigating to:', pageId);

        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.style.display = 'none';
        });

        // Show selected page
        const selectedPage = document.getElementById(pageId);
        if (selectedPage) {
            selectedPage.style.display = 'block';
        } else {
            console.error('Page not found:', pageId);
            return;
        }

        // Initialize maps/calendars when needed
        if (pageId === 'dealers') {
            setTimeout(() => initDealerMap(), 100);
        } else if (pageId === 'gps-tracking') {
            setTimeout(() => initGPSMap(), 100);
        } else if (pageId === 'booking-list') {
            if (typeof fetchBookingData === 'function') {
                // Determine if we need to fetch or just show
                // Using global currentPage from booking-list.js if avail
                const page = (typeof currentPage !== 'undefined') ? currentPage : 1;
                fetchBookingData(page);
            }
        } else if (pageId === 'booking-calendar') {
            console.log('=== CALENDAR PAGE NAVIGATION ===');
            console.log('Calendar object exists:', typeof window.calendar !== 'undefined' && window.calendar !== null);
            console.log('initCalendar function exists:', typeof window.initCalendar === 'function');

            setTimeout(() => {
                const calendarEl = document.getElementById('calendar');
                console.log('Calendar element found:', calendarEl !== null);

                if (window.calendar) {
                    console.log('Rendering existing calendar instance');
                    try {
                        window.calendar.render();
                        console.log('Calendar rendered successfully');
                    } catch (e) {
                        console.error('Calendar render error:', e);
                    }
                } else if (typeof window.initCalendar === 'function') {
                    console.log('Initializing new calendar');
                    try {
                        window.initCalendar();
                        console.log('Calendar initialized successfully');
                    } catch (e) {
                        console.error('Calendar init error:', e);
                    }
                } else {
                    console.error('Calendar not available - check if calendar.js loaded');
                }
            }, 100);
        }

        // Update active nav item
        // If element is passed, use it. If not, try to find link by onclick content
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        if (element) {
            // If the click was on a child (icon/span), find the parent .nav-item
            const navItem = element.closest('.nav-item');
            if (navItem) navItem.classList.add('active');
        } else {
            // Fallback: Try to find link matches pageId (simple heuristic)
            // This handles calls from code where element isn't passed
            const link = document.querySelector(`.nav-item[onclick*="'${pageId}'"]`);
            if (link) link.classList.add('active');
        }

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar').classList.remove('active');
        }
    } catch (e) {
        console.error('Navigation Error:', e);
        // Ensure page acts even if error
        const p = document.getElementById(pageId);
        if (p) p.style.display = 'block';
    }
}

// Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');

    // Check if mobile (<= 768px)
    if (window.innerWidth <= 768) {
        // Clean up desktop state just in case
        sidebar.classList.remove('collapsed');
        document.body.classList.remove('sidebar-collapsed');

        // Toggle mobile state
        sidebar.classList.toggle('active');

        // Close detail panel if open on mobile to avoid clutter
        const detailPanel = document.getElementById('detailPanel');
        if (detailPanel) detailPanel.classList.remove('open');
    } else {
        // Clean up mobile state
        sidebar.classList.remove('active');

        // Toggle desktop state
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        document.body.classList.toggle('sidebar-collapsed', isCollapsed);

        // Persist state
        localStorage.setItem('sidebar_collapsed', isCollapsed);
    }
}

// Mock Data for demonstration
const mockBookings = [
    {
        id: 'BK2024001',
        customerName: 'สมชาย ใจดี',
        customerPhone: '081-234-5678',
        model: 'YT357',
        startDate: '15 ม.ค. 2567',
        endDate: '15 เม.ย. 2567',
        location: 'กรุงเทพมหานคร',
        price: 45000,
        status: 'pending'
    },
    {
        id: 'BK2024002',
        customerName: 'สมหญิง รักดี',
        customerPhone: '089-876-5432',
        model: 'YT359',
        startDate: '16 ม.ค. 2567',
        endDate: '16 มี.ค. 2567',
        location: 'เชียงใหม่',
        price: 38000,
        status: 'approved'
    },
    {
        id: 'BK2024003',
        customerName: 'วิชัย มั่นคง',
        customerPhone: '092-345-6789',
        model: 'YT435',
        startDate: '17 ม.ค. 2567',
        endDate: '17 พ.ค. 2567',
        location: 'ขอนแก่น',
        price: 52000,
        status: 'delivering'
    }
];

// mockUsers removed

// Action Handlers (Mock)
function approveBooking(bookingId) {
    showNotification('อนุมัติการจองสำเร็จ', 'success');
    console.log('Approved booking:', bookingId);
}

function rejectBooking(bookingId) {
    showNotification('ปฏิเสธการจองสำเร็จ', 'warning');
    console.log('Rejected booking:', bookingId);
}

function viewBookingDetails(bookingId) {
    const bookingData = {
        '#BK2024001': {
            id: '#BK2024001',
            customer: 'สมชาย ใจดี',
            phone: '081-234-5678',
            email: 'somchai@email.com',
            model: 'YT357',
            startDate: '15 ม.ค. 2567',
            endDate: '15 เม.ย. 2567',
            location: 'กรุงเทพมหานคร',
            address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
            price: '฿45,000',
            status: 'รออนุมัติ',
            dealer: 'สาขากรุงเทพ',
            implements: 'รถไถ, รถพรวน',
            notes: 'ต้องการใช้งานในช่วงฤดูเพาะปลูก'
        },
        '#BK2024002': {
            id: '#BK2024002',
            customer: 'สมหญิง รักดี',
            phone: '089-876-5432',
            email: 'somying@email.com',
            model: 'YT359',
            startDate: '16 ม.ค. 2567',
            endDate: '16 มี.ค. 2567',
            location: 'เชียงใหม่',
            address: '456 ถนนห้วยแก้ว ตำบลสุเทพ อำเภอเมือง เชียงใหม่ 50200',
            price: '฿38,000',
            status: 'อนุมัติแล้ว',
            dealer: 'สาขาเชียงใหม่',
            implements: 'รถไถ',
            notes: 'ชำระเงินแล้ว'
        },
        '#BK2024003': {
            id: '#BK2024003',
            customer: 'วิชัย มั่นคง',
            phone: '092-345-6789',
            email: 'wichai@email.com',
            model: 'YT435',
            startDate: '17 ม.ค. 2567',
            endDate: '17 พ.ค. 2567',
            location: 'ขอนแก่น',
            address: '789 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมือง ขอนแก่น 40000',
            price: '฿52,000',
            status: 'กำลังส่งมอบ',
            dealer: 'สาขาขอนแก่น',
            implements: 'รถไถ, รถพรวน, รถเกี่ยว',
            notes: 'กำลังจัดส่ง คาดว่าถึงวันที่ 18 ม.ค. 2567'
        },
        'ID 00693': {
            id: 'ID 00693',
            customer: 'ร้านอมรชัยการเกษตร',
            phone: '081-111-1111',
            email: 'amornchai@example.com',
            model: 'YES 182FBT0 V 664',
            startDate: '21 ม.ค. 2569',
            endDate: '31 ม.ค. 2569',
            location: 'กรุงเทพมหานคร',
            address: '123 ถนนฟาร์ม กรุงเทพมหานคร',
            price: '-',
            status: 'รออนุมัติ',
            dealer: 'ร้านอมรชัยการเกษตร',
            implements: 'โปรฯ 10 วัน หรือ 50 ชั่วโมง',
            notes: 'รอการตรวจสอบเอกสาร'
        },
        'ID 00692': {
            id: 'ID 00692',
            customer: 'หจก.ง่วนฮงลีการเกษตร',
            phone: '081-222-2222',
            email: 'ngaunhonglee@example.com',
            model: 'YES 182FBT0 V 663',
            startDate: '09 ม.ค. 2569',
            endDate: '19 ม.ค. 2569',
            location: 'เชียงใหม่',
            address: '456 ถนนฟาร์ม เชียงใหม่',
            price: '-',
            status: 'รอตรวจสอบ',
            dealer: 'หจก.ง่วนฮงลีการเกษตร',
            implements: 'โปรฯ 10 วัน หรือ 50 ชั่วโมง',
            notes: 'เอกสารครบถ้วน'
        },
        'ID 00691': {
            id: 'ID 00691',
            customer: 'ร้านชวลิตยานยนต์',
            phone: '081-333-3333',
            email: 'chawalit@example.com',
            model: 'YES 182FBT0 V 664',
            startDate: '10 ธ.ค. 2568',
            endDate: '20 ธ.ค. 2568',
            location: 'ขอนแก่น',
            address: '789 ถนนฟาร์ม ขอนแก่น',
            price: '-',
            status: 'ยกเลิก',
            dealer: 'ร้านชวลิตยานยนต์',
            implements: 'โปรฯ 10 วัน หรือ 50 ชั่วโมง',
            notes: 'ลูกค้ายกเลิก'
        }
    };

    const booking = bookingData[bookingId];
    if (!booking) {
        showNotification('ไม่พบข้อมูลการจอง', 'error');
        return;
    }

    const modalBody = `
        <div class="modal-customer-header">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(booking.customer)}&background=random" alt="Customer">
            <div>
                <div class="modal-customer-name">${booking.customer}</div>
                <div class="modal-customer-contact">
                    <i class="fas fa-phone"></i> ${booking.phone}<br>
                    <i class="fas fa-envelope"></i> ${booking.email}
                </div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">ข้อมูลการจอง</div>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <div class="modal-info-label">รหัสการจอง</div>
                    <div class="modal-info-value">${booking.id}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">สถานะ</div>
                    <div class="modal-info-value">${booking.status}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">รุ่นรถ</div>
                    <div class="modal-info-value">${booking.model}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">ราคา</div>
                    <div class="modal-info-value" style="color: var(--primary-color);">${booking.price}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">วันที่เริ่มเช่า</div>
                    <div class="modal-info-value">${booking.startDate}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">วันที่สิ้นสุด</div>
                    <div class="modal-info-value">${booking.endDate}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">สาขา</div>
                    <div class="modal-info-value">${booking.dealer}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">อุปกรณ์เสริม</div>
                    <div class="modal-info-value">${booking.implements}</div>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">สถานที่ใช้งาน</div>
            <div class="modal-info-item">
                <div class="modal-info-label">จังหวัด</div>
                <div class="modal-info-value">${booking.location}</div>
            </div>
            <div class="modal-info-item" style="margin-top: var(--spacing-sm);">
                <div class="modal-info-label">ที่อยู่</div>
                <div class="modal-info-value">${booking.address}</div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">หมายเหตุ</div>
            <div class="modal-info-value">${booking.notes}</div>
        </div>
    `;

    openModal('รายละเอียดการจอง ' + bookingId, modalBody);
}

function viewUserDetails(userId, userName) {
    const modalBody = `
        <div class="modal-customer-header">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=4F46E5&color=fff" alt="User">
            <div>
                <div class="modal-customer-name">${userName}</div>
                <div class="modal-customer-contact">
                    <i class="fas fa-id-badge"></i> ${userId}
                </div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">ข้อมูลส่วนตัว</div>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <div class="modal-info-label">เบอร์โทรศัพท์</div>
                    <div class="modal-info-value">081-234-5678</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">อีเมล</div>
                    <div class="modal-info-value">user@email.com</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">เลขบัตรประชาชน</div>
                    <div class="modal-info-value">1-2345-67890-12-3</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">วันที่ลงทะเบียน</div>
                    <div class="modal-info-value">04 ก.พ. 2567 10:30</div>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">ที่อยู่</div>
            <div class="modal-info-value">123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110</div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">ประวัติการใช้งาน</div>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <div class="modal-info-label">จำนวนการจองทั้งหมด</div>
                    <div class="modal-info-value">0 ครั้ง</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">สถานะ</div>
                    <div class="modal-info-value">รอการยืนยัน</div>
                </div>
            </div>
        </div>
    `;

    openModal('ข้อมูลผู้ใช้งาน', modalBody);
}

function viewMachineDetails(machineId, machineName) {
    const modalBody = `
        <div style="margin-bottom: var(--spacing-lg);">
            <img src="https://via.placeholder.com/500x300/1976D2/FFFFFF?text=${encodeURIComponent(machineName)}" 
                 style="width: 100%; border-radius: var(--radius-md);" alt="${machineName}">
        </div>

        <div class="modal-section">
            <div class="modal-section-title">ข้อมูลรถแทรกเตอร์</div>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <div class="modal-info-label">รหัสรถ</div>
                    <div class="modal-info-value">${machineId}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">รุ่น</div>
                    <div class="modal-info-value">${machineName}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">แรงม้า</div>
                    <div class="modal-info-value">35 HP</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">สาขา</div>
                    <div class="modal-info-value">สาขากรุงเทพ</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">ราคาเช่า/เดือน</div>
                    <div class="modal-info-value" style="color: var(--primary-color);">฿15,000</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">สถานะ</div>
                    <div class="modal-info-value">ว่าง</div>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">ข้อมูลการใช้งาน</div>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <div class="modal-info-label">ชั่วโมงการใช้งาน</div>
                    <div class="modal-info-value">245 ชั่วโมง</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">การบำรุงรักษาล่าสุด</div>
                    <div class="modal-info-value">01 ม.ค. 2567</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">จำนวนครั้งที่ให้เช่า</div>
                    <div class="modal-info-value">12 ครั้ง</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">คะแนนเฉลี่ย</div>
                    <div class="modal-info-value">⭐⭐⭐⭐⭐ (5.0)</div>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">รายละเอียดเพิ่มเติม</div>
            <div class="modal-info-value">
                รถแทรกเตอร์ Yanmar YT357 เป็นรถแทรกเตอร์ขนาดกลาง เหมาะสำหรับงานเกษตรทั่วไป 
                มีกำลังเครื่องยนต์ 35 แรงม้า พร้อมระบบขับเคลื่อน 4 ล้อ มีอุปกรณ์เสริมครบครัน
            </div>
        </div>
    `;

    openModal('รายละเอียดรถแทรกเตอร์', modalBody);
}

function viewDealerDetails(dealerId, dealerName) {
    const modalBody = `
        <div class="modal-section">
            <div class="modal-section-title">ข้อมูลสาขา</div>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <div class="modal-info-label">รหัสสาขา</div>
                    <div class="modal-info-value">${dealerId}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">ชื่อสาขา</div>
                    <div class="modal-info-value">${dealerName}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">เบอร์โทรศัพท์</div>
                    <div class="modal-info-value">02-123-4567</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">อีเมล</div>
                    <div class="modal-info-value">bangkok@yanmar.com</div>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">ที่อยู่</div>
            <div class="modal-info-value">
                123 ถนนพระราม 4 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">สถิติรถแทรกเตอร์</div>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <div class="modal-info-label">รถทั้งหมด</div>
                    <div class="modal-info-value">15 คัน</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">รถว่าง</div>
                    <div class="modal-info-value" style="color: var(--success-color);">8 คัน</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">รถถูกจอง</div>
                    <div class="modal-info-value" style="color: var(--warning-color);">4 คัน</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">รถกำลังใช้งาน</div>
                    <div class="modal-info-value" style="color: var(--info-color);">3 คัน</div>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">ผู้จัดการสาขา</div>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <div class="modal-info-label">ชื่อ</div>
                    <div class="modal-info-value">คุณสมชาย ใจดี</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">เบอร์โทรศัพท์</div>
                    <div class="modal-info-value">081-234-5678</div>
                </div>
            </div>
        </div>
    `;

    openModal('รายละเอียดสาขา', modalBody);
}

// Modal control functions
// Modal & Detail Panel control functions
function openModal(title, bodyContent) {
    // Priority: Detail Panel (AppSheet Desktop Style)
    const panel = document.getElementById('detailPanel');
    if (panel) {
        const headerTitle = panel.querySelector('.detail-header h3');
        if (headerTitle) headerTitle.textContent = title;

        const panelBody = document.getElementById('detailBody');
        if (panelBody) panelBody.innerHTML = bodyContent;

        panel.classList.add('open');

        // Highlight active card if event triggered
        if (event && event.currentTarget && event.currentTarget.classList.contains('booking-card')) {
            document.querySelectorAll('.booking-card').forEach(c => c.classList.remove('selected'));
            event.currentTarget.classList.add('selected');
        }
        return;
    }

    // Fallback: Popup Modal
    const modal = document.getElementById('detailModal');
    if (modal) {
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = title;
        modalBody.innerHTML = bodyContent;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    // Close Panel
    const panel = document.getElementById('detailPanel');
    if (panel && panel.classList.contains('open')) {
        panel.classList.remove('open');
        // Deselect cards
        document.querySelectorAll('.booking-card').forEach(c => c.classList.remove('selected'));
        return;
    }

    // Close Modal
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Alias for HTML handlers
const closeDetailPanel = closeModal;

// OpenStreetMap Initialization
let dealerMap = null;
let gpsMap = null;
let gpsMarkers = {};

// Initialize Dealer Map
function initDealerMap() {
    if (dealerMap) return; // Already initialized

    const mapElement = document.getElementById('dealerMap');
    if (!mapElement) return;

    // Center of Thailand
    dealerMap = L.map('dealerMap').setView([13.7563, 100.5018], 6);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(dealerMap);

    // Dealer locations
    const dealers = [
        { name: 'สาขากรุงเทพ', lat: 13.7563, lng: 100.5018, type: 'main', vehicles: 15, available: 8 },
        { name: 'สาขาเชียงใหม่', lat: 18.7883, lng: 98.9853, type: 'branch', vehicles: 12, available: 5 },
        { name: 'สาขาขอนแก่น', lat: 16.4322, lng: 102.8236, type: 'branch', vehicles: 18, available: 10 },
        { name: 'สาขาภูเก็ต', lat: 7.8804, lng: 98.3923, type: 'branch', vehicles: 10, available: 6 }
    ];

    // Add markers for each dealer
    dealers.forEach(dealer => {
        const iconColor = dealer.type === 'main' ? '#D32F2F' : '#66BB6A';

        const customIcon = L.divIcon({
            className: 'custom-dealer-marker',
            html: `<div style="background: ${iconColor}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-store"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker([dealer.lat, dealer.lng], { icon: customIcon }).addTo(dealerMap);

        marker.bindPopup(`
            <div style="min-width: 200px;">
                <h4 style="margin: 0 0 8px 0; color: #D32F2F;">${dealer.name}</h4>
                <p style="margin: 4px 0; font-size: 13px;"><i class="fas fa-tractor"></i> รถทั้งหมด: ${dealer.vehicles} คัน</p>
                <p style="margin: 4px 0; font-size: 13px; color: #66BB6A;"><i class="fas fa-check-circle"></i> รถว่าง: ${dealer.available} คัน</p>
            </div>
        `);
    });
}

// Initialize GPS Tracking Map
function initGPSMap() {
    if (gpsMap) return; // Already initialized

    const mapElement = document.getElementById('gpsMap');
    if (!mapElement) return;

    // Center of Thailand
    gpsMap = L.map('gpsMap').setView([15.8700, 100.9925], 6);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(gpsMap);

    // Sample vehicle locations
    const vehicles = [
        { id: 'YT435-003', name: 'Yanmar YT435', lat: 16.4322, lng: 102.8236, status: 'delivering', driver: 'สมชาย รักษ์ดี', destination: 'ขอนแก่น' },
        { id: 'YT359-002', name: 'Yanmar YT359', lat: 18.7883, lng: 98.9853, status: 'in-use', driver: 'สมหญิง รักดี', destination: 'เชียงใหม่' },
        { id: 'YT357-001', name: 'Yanmar YT357', lat: 13.7563, lng: 100.5018, status: 'delivering', driver: 'วิชัย ดีงาม', destination: 'กรุงเทพฯ' }
    ];

    // Add markers for each vehicle
    vehicles.forEach(vehicle => {
        const iconColor = vehicle.status === 'delivering' ? '#0288D1' : '#66BB6A';

        const customIcon = L.divIcon({
            className: 'custom-vehicle-marker',
            html: `<div style="background: ${iconColor}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); animation: pulse-marker 2s infinite;"><i class="fas fa-tractor"></i></div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        const marker = L.marker([vehicle.lat, vehicle.lng], { icon: customIcon }).addTo(gpsMap);
        gpsMarkers[vehicle.id] = marker;

        marker.bindPopup(`
            <div style="min-width: 200px;">
                <h4 style="margin: 0 0 8px 0; color: #D32F2F;">${vehicle.id}</h4>
                <p style="margin: 4px 0; font-size: 13px;">${vehicle.name}</p>
                <p style="margin: 4px 0; font-size: 13px;"><i class="fas fa-user"></i> ${vehicle.driver}</p>
                <p style="margin: 4px 0; font-size: 13px;"><i class="fas fa-map-marker-alt"></i> ${vehicle.destination}</p>
            </div>
        `);
    });
}

// GPS Tracking Functions
function focusVehicle(vehicleId) {
    showNotification(`โฟกัสไปที่รถ ${vehicleId}`, 'info');
    console.log('Focus vehicle:', vehicleId);

    // Remove active class from all items
    document.querySelectorAll('.gps-vehicle-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to clicked item
    event.target.closest('.gps-vehicle-item')?.classList.add('active');

    // Focus on vehicle marker on map
    if (gpsMap && gpsMarkers[vehicleId]) {
        const marker = gpsMarkers[vehicleId];
        gpsMap.setView(marker.getLatLng(), 12);
        marker.openPopup();
    }
}

// Calendar Logic
let currentCalendarDate = new Date();
const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Update Header
    document.getElementById('currentMonthYear').textContent = `${thaiMonths[month]} ${year + 543}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    // Add prev month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const day = prevLastDay.getDate() - i;
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        div.innerHTML = `<span class="calendar-day-number">${day}</span>`;
        grid.appendChild(div);
    }

    // Add current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';

        // Check if today
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            div.classList.add('today');
        }

        div.onclick = () => showNotification(`เลือกวันที่ ${i} ${thaiMonths[month]}`, 'info');

        // Add events (Mock data for demo)
        const events = getEventsForDate(i, month, year);
        let eventsHtml = '';
        events.forEach((event, index) => {
            if (index < 3) {
                const statusClass = getStatusClass(event.status);
                eventsHtml += `<div class="calendar-event ${statusClass}" onclick="event.stopPropagation(); viewBookingDetails('${event.id}')">
                    ${event.id} - ${event.customerName}
                </div>`;
            }
        });

        if (events.length > 3) {
            eventsHtml += `<div class="event-more">+ อีก ${events.length - 3} รายการ</div>`;
        }

        div.innerHTML = `
            <span class="calendar-day-number">${i}</span>
            <div class="calendar-events">
                ${eventsHtml}
            </div>
        `;

        grid.appendChild(div);
    }

    // Add next month days to fill grid (42 cells total for 6 rows)
    const totalCells = 42;
    const filledCells = startDayOfWeek + daysInMonth;
    const remainingCells = totalCells - filledCells;

    for (let i = 1; i <= remainingCells; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        div.innerHTML = `<span class="calendar-day-number">${i}</span>`;
        grid.appendChild(div);
    }
}

function getEventsForDate(day, month, year) {
    // Generate some mock events based on day to make calendar look active
    // This is just for demonstration since real parsing of thai dates is complex
    const events = [];

    // Add real mock bookings if they match (simplified)
    // In a real app, we would parse start/end dates from bookings

    // Randomly add mock events
    if ((day + month) % 7 === 0) {
        events.push({ id: 'BK2024001', customerName: 'สมชาย ใจดี', status: 'pending' });
    }
    if ((day + month) % 5 === 0) {
        events.push({ id: 'BK2024002', customerName: 'สมหญิง รักดี', status: 'approved' });
    }
    if ((day + month) % 11 === 0) {
        events.push({ id: 'BK2024003', customerName: 'วิชัย มั่นคง', status: 'delivering' });
    }

    return events;
}

function getStatusClass(status) {
    switch (status) {
        case 'pending': return 'event-pending';
        case 'approved': return 'event-approved';
        case 'delivering': return 'event-delivering';
        default: return '';
    }
}

function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

function today() {
    currentCalendarDate = new Date();
    renderCalendar();
}

function approveUser(userName) {
    showNotification(`อนุมัติผู้ใช้ ${userName} สำเร็จ`, 'success');
    console.log('Approved user:', userName);
}

function rejectUser(userName) {
    showNotification(`ปฏิเสธผู้ใช้ ${userName} สำเร็จ`, 'warning');
    console.log('Rejected user:', userName);
}

// Notification System
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;

    // Add to body
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'warning': 'exclamation-triangle',
        'error': 'times-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Add notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 80px;
        right: -400px;
        background: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        transition: right 0.3s ease;
        min-width: 300px;
        border-left: 4px solid;
    }
    
    .notification.show {
        right: 24px;
    }
    
    .notification-success {
        border-left-color: #66BB6A;
    }
    
    .notification-success i {
        color: #66BB6A;
    }
    
    .notification-warning {
        border-left-color: #FFA726;
    }
    
    .notification-warning i {
        color: #FFA726;
    }
    
    .notification-error {
        border-left-color: #EF5350;
    }
    
    .notification-error i {
        color: #EF5350;
    }
    
    .notification-info {
        border-left-color: #29B6F6;
    }
    
    .notification-info i {
        color: #29B6F6;
    }
    
    .notification i {
        font-size: 20px;
    }
    
    .notification span {
        flex: 1;
        font-weight: 500;
        color: #212121;
    }
`;
document.head.appendChild(notificationStyles);

// Search functionality
function setupSearch() {
    const searchInputs = document.querySelectorAll('.search-box input');
    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            console.log('Searching for:', searchTerm);
            // Implement search logic here
        });
    });
}

// Filter functionality
function setupFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', (e) => {
            const filterValue = e.target.value;
            console.log('Filtering by:', filterValue);
            // Implement filter logic here
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    setupSearch();
    setupFilters();

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', function (e) {
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');

        if (window.innerWidth <= 768 && sidebar && mobileMenuBtn) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });

    // Handle window resize
    window.addEventListener('resize', function () {
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth > 768 && sidebar) {
            sidebar.classList.remove('active');
        }
    });
});

// Export functions for use in HTML
window.showPage = showPage;
window.toggleSidebar = toggleSidebar;
window.approveBooking = approveBooking;
window.rejectBooking = rejectBooking;
window.viewBookingDetails = viewBookingDetails;
window.viewUserDetails = viewUserDetails;
window.viewMachineDetails = viewMachineDetails;
window.viewDealerDetails = viewDealerDetails;
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.openModal = openModal;
window.closeModal = closeModal;
window.focusVehicle = focusVehicle;
window.changeMonth = changeMonth;
window.today = today;

function handleFabClick() {
    // Determine action based on visible page
    const pages = ['dashboard', 'booking-list', 'dealers', 'machines', 'promotions'];
    let activePage = 'dashboard';

    pages.forEach(page => {
        const el = document.getElementById(page);
        if (el && el.style.display !== 'none') {
            activePage = page;
        }
    });

    switch (activePage) {
        case 'dashboard':
        case 'booking-list':
            showNotification('ฟอร์มสร้างการจองใหม่จะปรากฏที่นี่', 'info');
            break;
        case 'dealers':
            showNotification('ฟอร์มเพิ่มสาขาจะปรากฏที่นี่', 'info');
            break;
        case 'machines':
            showNotification('ฟอร์มเพิ่มรถแทรกเตอร์จะปรากฏที่นี่', 'info');
            break;
        case 'promotions':
            showNotification('ฟอร์มสร้างโปรโมชั่นจะปรากฏที่นี่', 'info');
            break;
        default:
            showNotification('ฟีเจอร์นี้กำลังพัฒนา', 'info');
    }
}
window.handleFabClick = handleFabClick;
