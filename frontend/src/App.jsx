import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import BookingPage from './pages/BookingPage.jsx'
import EditBookingPage from './pages/EditBookingPage.jsx'
import AiStudioPage from './pages/AiStudioPage.jsx'
import GalleryPage from './pages/GalleryPage.jsx'
import CustomerHistoryPage from './pages/CustomerHistoryPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
// หน้าแอดมินโหลดแยกไฟล์ (ลูกค้าไม่ต้องดาวน์โหลดโค้ดแอดมิน) การทำงานเหมือนเดิมทุกอย่าง
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage.jsx'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage.jsx'))
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage.jsx'))
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage.jsx'))
const AdminServicesPage = lazy(() => import('./pages/admin/AdminServicesPage.jsx'))
const AdminDesignsPage = lazy(() => import('./pages/admin/AdminDesignsPage.jsx'))
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage.jsx'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage.jsx'))
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage.jsx'))
import SplashIntro from './components/SplashIntro.jsx'

export default function App() {
  const { pathname, hash } = useLocation()
  // เปลี่ยนหน้าแล้วเริ่มที่ด้านบนเสมอ (ยกเว้นลิงก์ที่ชี้ไปส่วนในหน้า เช่น /#services)
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])
  // เปลี่ยนหน้าแบบจางเข้า (เฉพาะหน้าลูกค้า หน้าแอดมินไม่ทำ เพื่อไม่ให้เมนูแอดมินโหลดใหม่ทุกครั้ง)
  const pageKey = pathname.startsWith('/admin') ? 'admin' : pathname
  return (
    <>
    <SplashIntro />
    <div key={pageKey} className={pageKey === 'admin' ? undefined : 'lucky-page'}>
    <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/booking" element={<BookingPage />} />
      <Route path="/booking/edit" element={<EditBookingPage />} />
      <Route path="/ai" element={<AiStudioPage />} />
      <Route path="/gallery" element={<GalleryPage />} />
      <Route path="/history" element={<CustomerHistoryPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="services" element={<AdminServicesPage />} />
        <Route path="designs" element={<AdminDesignsPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
    </div>
    </>
  )
}
