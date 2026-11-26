import { useEffect } from 'react'

// ตั้งชื่อแท็บของหน้า (ช่วยคนใช้โปรแกรมอ่านหน้าจอ และตอนเปิดหลายแท็บ) แล้วคืนชื่อเดิมตอนออกจากหน้า
export default function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
