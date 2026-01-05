/**
 * Urgent Messages Notifications Service
 * خدمة إشعارات الرسائل العاجلة
 * 
 * Handles browser notifications and sound alerts for urgent messages
 * يتعامل مع إشعارات المتصفح والتنبيهات الصوتية للرسائل العاجلة
 */

// Sound notification utility
export function playMessageSound() {
  try {
    // Create audio context for a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800 // Higher pitch for urgency
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.error('Error playing message sound:', error)
  }
}

// Browser notification utility
export async function showMessageNotification(
  senderName: string,
  messageText: string,
  conversationSubject?: string
) {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications')
    return
  }

  if (Notification.permission === 'granted') {
    try {
      const title = conversationSubject 
        ? `New Message: ${conversationSubject} / رسالة جديدة: ${conversationSubject}`
        : `New Message from ${senderName} / رسالة جديدة من ${senderName}`
      
      const body = messageText.length > 100 
        ? `${messageText.substring(0, 100)}...`
        : messageText

      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `urgent-message-${Date.now()}`,
        requireInteraction: false,
        silent: false
      })

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)

      // Play sound
      playMessageSound()

      // Handle click to focus window
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch (error) {
      console.error('Error showing notification:', error)
    }
  } else if (Notification.permission === 'default') {
    // Request permission
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      showMessageNotification(senderName, messageText, conversationSubject)
    }
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

