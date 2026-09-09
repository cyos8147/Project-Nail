import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import BookingPage from './pages/BookingPage.jsx'
import EditBookingPage from './pages/EditBookingPage.jsx'
import AiStudioPage from './pages/AiStudioPage.jsx'
import BookingStatusPage from './pages/BookingStatusPage.jsx'
import CustomerHistoryPage from './pages/CustomerHistoryPage.jsx'
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import DashboardPage from './pages/admin/DashboardPage.jsx'
import AdminBookingsPage from './pages/admin/AdminBookingsPage.jsx'
import AdminCustomersPage from './pages/admin/AdminCustomersPage.jsx'
import AdminServicesPage from './pages/admin/AdminServicesPage.jsx'
import AdminDesignsPage from './pages/admin/AdminDesignsPage.jsx'
import AdminReviewsPage from './pages/admin/AdminReviewsPage.jsx'
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/booking" element={<BookingPage />} />
      <Route path="/booking/edit" element={<EditBookingPage />} />
      <Route path="/ai" element={<AiStudioPage />} />
      <Route path="/status" element={<BookingStatusPage />} />
      <Route path="/history" element={<CustomerHistoryPage />} />

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="services" element={<AdminServicesPage />} />
        <Route path="designs" element={<AdminDesignsPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  )
}
