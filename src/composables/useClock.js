import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useClock(timeZone = 'Asia/Shanghai') {
  const time = ref('00:00:00')

  let timer = null

  const update = () => {
    try {
      time.value = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date())
    } catch {
      time.value = new Date().toLocaleTimeString('en-GB', { hour12: false })
    }
  }

  onMounted(() => {
    update()
    timer = window.setInterval(update, 1000)
  })

  onBeforeUnmount(() => {
    if (timer) window.clearInterval(timer)
  })

  return time
}
