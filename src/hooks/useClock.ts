import { useEffect, useState } from 'react'

export function useClock(timeZone = 'Asia/Shanghai') {
  const [time, setTime] = useState('00:00:00')

  useEffect(() => {
    const update = () => {
      try {
        setTime(
          new Intl.DateTimeFormat('en-GB', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).format(new Date())
        )
      } catch {
        setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }))
      }
    }

    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [timeZone])

  return time
}
