'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock, Bell, BellRing } from 'lucide-react'
import { format } from 'date-fns'

interface PrayerTime {
  name: string
  time: Date
  arabicName: string
}

const prayerNames = {
  fajr: { en: 'Fajr', ar: 'الفجر' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
  asr: { en: 'Asr', ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha: { en: 'Isha', ar: 'العشاء' }
}

// Fetch prayer times from Aladhan API
async function fetchPrayerTimes(date: Date = new Date(), latitude: number = 30.0444, longitude: number = 31.2357): Promise<PrayerTime[]> {
  try {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    // Use Aladhan API (free, no API key required)
    const response = await fetch(
      `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=5`
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch prayer times')
    }
    
    const data = await response.json()
    const todayData = data.data.find((d: any) => d.date.gregorian.day === day.toString())
    
    if (!todayData) {
      throw new Error('Today\'s prayer times not found')
    }
    
    const timings = todayData.timings
    const times: PrayerTime[] = []
    
    // Parse prayer times
    const parseTime = (timeStr: string): Date | null => {
      if (!timeStr || typeof timeStr !== 'string') {
        return null
      }
      
      try {
        // Remove any non-numeric characters except colon (e.g., "04:30 (EET)" -> "04:30")
        const cleanTime = timeStr.split(' ')[0].trim()
        const parts = cleanTime.split(':')
        
        if (parts.length < 2) {
          return null
        }
        
        const hours = parseInt(parts[0], 10)
        const minutes = parseInt(parts[1], 10)
        
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return null
        }
        
        const prayerDate = new Date(date)
        prayerDate.setHours(hours, minutes, 0, 0)
        
        // Validate the date
        if (isNaN(prayerDate.getTime())) {
          return null
        }
        
        return prayerDate
      } catch (error) {
        console.error(`Error parsing time: ${timeStr}`, error)
        return null
      }
    }
    
    // Parse each prayer time and only add valid ones
    const fajrTime = parseTime(timings.Fajr)
    if (fajrTime) {
      times.push({
        name: prayerNames.fajr.en,
        arabicName: prayerNames.fajr.ar,
        time: fajrTime
      })
    }
    
    const dhuhrTime = parseTime(timings.Dhuhr)
    if (dhuhrTime) {
      times.push({
        name: prayerNames.dhuhr.en,
        arabicName: prayerNames.dhuhr.ar,
        time: dhuhrTime
      })
    }
    
    const asrTime = parseTime(timings.Asr)
    if (asrTime) {
      times.push({
        name: prayerNames.asr.en,
        arabicName: prayerNames.asr.ar,
        time: asrTime
      })
    }
    
    const maghribTime = parseTime(timings.Maghrib)
    if (maghribTime) {
      times.push({
        name: prayerNames.maghrib.en,
        arabicName: prayerNames.maghrib.ar,
        time: maghribTime
      })
    }
    
    const ishaTime = parseTime(timings.Isha)
    if (ishaTime) {
      times.push({
        name: prayerNames.isha.en,
        arabicName: prayerNames.isha.ar,
        time: ishaTime
      })
    }
    
    // If we couldn't parse any times, throw error to use fallback
    if (times.length === 0) {
      throw new Error('No valid prayer times could be parsed')
    }
    
    return times.sort((a, b) => a.time.getTime() - b.time.getTime())
  } catch (error) {
    console.error('Error fetching prayer times:', error)
    // Fallback to approximate times
    return getFallbackPrayerTimes(date)
  }
}

// Fallback prayer times calculation
function getFallbackPrayerTimes(date: Date): PrayerTime[] {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  const baseTimes = {
    fajr: new Date(year, month - 1, day, 4, 30),
    dhuhr: new Date(year, month - 1, day, 12, 0),
    asr: new Date(year, month - 1, day, 15, 30),
    maghrib: new Date(year, month - 1, day, 18, 0),
    isha: new Date(year, month - 1, day, 19, 30)
  }

  const times: PrayerTime[] = []
  Object.entries(baseTimes).forEach(([key, time]) => {
    times.push({
      name: prayerNames[key as keyof typeof prayerNames].en,
      arabicName: prayerNames[key as keyof typeof prayerNames].ar,
      time: time
    })
  })

  return times.sort((a, b) => a.time.getTime() - b.time.getTime())
}

export function PrayerTimesWidget() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [hasNotified, setHasNotified] = useState(false)
  const [showInAppNotification, setShowInAppNotification] = useState(false)
  const [inAppNotificationData, setInAppNotificationData] = useState<{title: string, body: string, isPrayerTime: boolean} | null>(null)
  const notificationShownRef = useRef(false)

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(err => {
        console.error('Error requesting notification permission:', err)
      })
    }

    // Fetch prayer times for today
    const today = new Date()
    fetchPrayerTimes(today).then(times => {
      setPrayerTimes(times)
    }).catch(err => {
      console.error('Error fetching prayer times:', err)
    })
  }, [])

  useEffect(() => {
    if (prayerTimes.length === 0) return

    // Update current time every second
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)

      // Filter out invalid prayer times
      const validPrayerTimes = prayerTimes.filter(prayer => 
        prayer && prayer.time && !isNaN(prayer.time.getTime())
      )

      if (validPrayerTimes.length === 0) return

      // Find next prayer
      let next = validPrayerTimes.find((prayer: PrayerTime) => {
        if (!prayer.time || isNaN(prayer.time.getTime())) return false
        return prayer.time > now
      })
      
      // If no prayer today, use first prayer tomorrow (will be handled on next fetch)
      if (!next) {
        // Check if we're past the last prayer of today
        const lastPrayer = validPrayerTimes[validPrayerTimes.length - 1]
        if (lastPrayer && lastPrayer.time && !isNaN(lastPrayer.time.getTime()) && now > lastPrayer.time) {
          // Get tomorrow's first prayer
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(0, 0, 0, 0)
          fetchPrayerTimes(tomorrow).then(tomorrowTimes => {
            const validTomorrowTimes = tomorrowTimes.filter(t => 
              t && t.time && !isNaN(t.time.getTime())
            )
            if (validTomorrowTimes.length > 0) {
              setNextPrayer(validTomorrowTimes[0])
              setPrayerTimes([...validPrayerTimes, ...validTomorrowTimes])
            }
          }).catch(err => {
            console.error('Error fetching tomorrow prayer times:', err)
          })
          return
        }
        // Otherwise use first prayer of today
        next = validPrayerTimes[0]
      }
      
      if (next && next.time && !isNaN(next.time.getTime())) {
        setNextPrayer(next)
        
        // Calculate time remaining (hours, minutes, seconds)
        const diff = next.time.getTime() - now.getTime()
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((diff % (1000 * 60)) / 1000)
          
          if (hours > 0) {
            setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
          } else if (minutes > 0) {
            setTimeRemaining(`${minutes}m ${seconds}s`)
          } else {
            setTimeRemaining(`${seconds}s`)
          }
        }

        // Show notification 5 minutes before prayer time (between 5:00 and 4:59 minutes)
        if (diff <= 5 * 60 * 1000 && diff > 4 * 60 * 1000 && !notificationShownRef.current) {
          console.log(`[Prayer Notification] 5 minutes before ${next.name}:`, new Date())
          showNotification(next, false)
          showInAppNotificationFunc(next, false)
          notificationShownRef.current = true
          setHasNotified(true)
        }

        // Show notification exactly at prayer time (within 1 minute)
        if (diff <= 60 * 1000 && diff > 0 && !notificationShownRef.current) {
          console.log(`[Prayer Notification] Prayer time for ${next.name}:`, new Date())
          showNotification(next, true)
          showInAppNotificationFunc(next, true)
          notificationShownRef.current = true
          setHasNotified(true)
        }

        // Reset notification flag when prayer time passes (1 minute after)
        if (diff <= -60 * 1000) {
          notificationShownRef.current = false
          setHasNotified(false)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [prayerTimes])

  const showInAppNotificationFunc = (prayer: PrayerTime, isPrayerTime: boolean = false) => {
    const title = isPrayerTime 
      ? `حان وقت الأذان - ${prayer.arabicName} / Prayer Time - ${prayer.name}`
      : `وقت الأذان - ${prayer.arabicName} / Prayer Time - ${prayer.name}`
    
    const body = isPrayerTime
      ? `حان وقت أذان ${prayer.arabicName} (${prayer.name}) / It's time for ${prayer.name} prayer`
      : `يتبقى 5 دقائق على أذان ${prayer.arabicName} (${prayer.name}) / 5 minutes until ${prayer.name} prayer`

    setInAppNotificationData({ title, body, isPrayerTime })
    setShowInAppNotification(true)

    // Auto hide after 8 seconds
    setTimeout(() => {
      setShowInAppNotification(false)
    }, 8000)
  }

  const showNotification = (prayer: PrayerTime, isPrayerTime: boolean = false) => {
    const title = isPrayerTime 
      ? `حان وقت الأذان - ${prayer.arabicName} / Prayer Time - ${prayer.name}`
      : `وقت الأذان - ${prayer.arabicName} / Prayer Time - ${prayer.name}`
    
    const body = isPrayerTime
      ? `حان وقت أذان ${prayer.arabicName} (${prayer.name}) / It's time for ${prayer.name} prayer`
      : `يتبقى 5 دقائق على أذان ${prayer.arabicName} (${prayer.name}) / 5 minutes until ${prayer.name} prayer`

    console.log(`[Prayer Notification] Attempting to show:`, { 
      title, 
      body, 
      permission: 'Notification' in window ? Notification.permission : 'not supported',
      isPrayerTime 
    })

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `prayer-${prayer.name}-${isPrayerTime ? 'time' : '5min'}-${Date.now()}`,
            requireInteraction: isPrayerTime,
            silent: false
          })
          
          console.log(`[Prayer Notification] ✅ Notification shown successfully`)
          
          // Auto close after 10 seconds
          setTimeout(() => {
            notification.close()
          }, 10000)
        } catch (error) {
          console.error('[Prayer Notification] ❌ Error showing notification:', error)
        }
      } else if (Notification.permission === 'default') {
        // Request permission if not yet asked
        Notification.requestPermission().then(permission => {
          console.log(`[Prayer Notification] Permission result:`, permission)
          if (permission === 'granted') {
            try {
              const notification = new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `prayer-${prayer.name}-${isPrayerTime ? 'time' : '5min'}-${Date.now()}`,
                requireInteraction: isPrayerTime
              })
              
              setTimeout(() => {
                notification.close()
              }, 10000)
            } catch (error) {
              console.error('[Prayer Notification] ❌ Error showing notification after permission:', error)
            }
          }
        }).catch(err => {
          console.error('[Prayer Notification] ❌ Error requesting permission:', err)
        })
      } else {
        console.warn('[Prayer Notification] ⚠️ Notification permission denied by user')
      }
    } else {
      console.warn('[Prayer Notification] ⚠️ Notifications not supported in this browser')
    }
  }

  if (!nextPrayer || !nextPrayer.time || isNaN(nextPrayer.time.getTime())) {
    return null
  }

  // Format time safely
  const formatTime = (date: Date): string => {
    try {
      if (!date || isNaN(date.getTime())) {
        return '--:--'
      }
      return format(date, 'HH:mm')
    } catch (error) {
      console.error('Error formatting time:', error)
      return '--:--'
    }
  }

  // Get next prayer after current
  const currentIndex = prayerTimes.findIndex(p => p.name === nextPrayer.name)
  const nextAfterCurrent = currentIndex >= 0 && currentIndex < prayerTimes.length - 1
    ? prayerTimes[currentIndex + 1]
    : prayerTimes[0]

  return (
    <>
      {/* In-App Notification Toast */}
      {showInAppNotification && inAppNotificationData && (
        <div className="fixed top-20 right-6 z-[9999] animate-slide-in-right">
          <div className={`relative max-w-md w-full bg-gradient-to-r ${
            inAppNotificationData.isPrayerTime 
              ? 'from-violet-600 via-purple-600 to-indigo-600' 
              : 'from-violet-500 via-purple-500 to-indigo-500'
          } text-white rounded-xl shadow-2xl border-2 border-white/20 p-4 backdrop-blur-sm`}>
            {/* Close Button */}
            <button
              onClick={() => setShowInAppNotification(false)}
              className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <span className="text-white text-lg font-bold">×</span>
            </button>

            {/* Content */}
            <div className="flex items-start gap-3 pr-6">
              <div className={`p-2 rounded-lg ${
                inAppNotificationData.isPrayerTime 
                  ? 'bg-white/30' 
                  : 'bg-white/20'
              }`}>
                <BellRing className={`h-5 w-5 text-white ${inAppNotificationData.isPrayerTime ? 'animate-pulse' : ''}`} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-base mb-1">{inAppNotificationData.title}</h4>
                <p className="text-sm text-white/90">{inAppNotificationData.body}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-xl overflow-hidden">
              <div 
                className="h-full bg-white/50 animate-shrink"
                style={{ animationDuration: '8s' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Simplified Prayer Times Widget */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
        {/* Prayer Icon & Name - Bilingual */}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {nextPrayer.arabicName} / {nextPrayer.name}
          </span>
        </div>

        {/* Time */}
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {formatTime(nextPrayer.time)}
        </span>

        {/* Divider */}
        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Countdown - Bilingual */}
        <div className="flex items-center gap-1.5">
          <BellRing className={`h-3.5 w-3.5 ${hasNotified ? 'text-violet-600 dark:text-violet-400 animate-pulse' : 'text-gray-500 dark:text-gray-400'}`} />
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
            <span className="text-gray-500 dark:text-gray-400">الوقت المتبقي / Time Remaining:</span> {timeRemaining}
          </span>
        </div>
      </div>
    </>
  )
}

