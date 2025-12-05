'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  MapPin, Plus, Edit, Trash2, Search, X, CheckCircle, AlertCircle,
  Navigation, Radio, Globe, RefreshCw, Briefcase, FolderKanban, ExternalLink, Star, Filter, Link2, Bell
} from 'lucide-react'
import { supabase, TABLES, AttendanceLocation, Project } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { usePermissionGuard } from '@/lib/permissionGuard'

export function LocationsManagement() {
  const guard = usePermissionGuard()
  const [locations, setLocations] = useState<AttendanceLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Check permissions
  const canCreate = guard.hasAccess('hr.attendance.locations.create')
  const canEdit = guard.hasAccess('hr.attendance.locations.edit')
  const canDelete = guard.hasAccess('hr.attendance.locations.delete')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState<AttendanceLocation | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: '100',
    description: '',
    is_active: true
  })
  const [mapUrl, setMapUrl] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isImportingFromProjects, setIsImportingFromProjects] = useState(false)
  const [newProjectLocation, setNewProjectLocation] = useState<any | null>(null)
  const [ignoredProjects, setIgnoredProjects] = useState<Set<string>>(new Set())
  const [pendingProjects, setPendingProjects] = useState<any[]>([]) // All pending projects
  const [activeTab, setActiveTab] = useState<'locations' | 'notifications'>('locations')
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false)
  const supabaseClient = getSupabaseClient()

  useEffect(() => {
    fetchLocations()
    getCurrentLocation()
  }, [])

  useEffect(() => {
    if (locations.length > 0) {
      checkForNewProjects()
      // Also sync existing locations with projects
      syncLocationsWithProjects()
      
      // Check for new projects and sync every 30 seconds
      const interval = setInterval(() => {
        checkForNewProjects()
        syncLocationsWithProjects()
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [locations.length, ignoredProjects.size])

  // Real-time subscription to monitor project changes
  useEffect(() => {
    let channel: any = null

    const setupSubscription = async () => {
      try {
        channel = supabaseClient
          .channel('projects-changes')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: TABLES.PROJECTS
            },
            (payload) => {
              console.log('🔔 Project change detected:', payload.eventType, payload)
              
              // Check if the project has coordinates
              const newRecord = payload.new as any
              const oldRecord = payload.old as any
              
              const hasCoordinates = (record: any) => {
                if (!record) return false
                const lat = parseFloat(record.Latitude || record.latitude || '')
                const lng = parseFloat(record.Longitude || record.longitude || '')
                return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
              }

              const coordinatesChanged = (oldRec: any, newRec: any) => {
                if (!oldRec || !newRec) return false
                const oldLat = parseFloat(oldRec.Latitude || oldRec.latitude || '')
                const oldLng = parseFloat(oldRec.Longitude || oldRec.longitude || '')
                const newLat = parseFloat(newRec.Latitude || newRec.latitude || '')
                const newLng = parseFloat(newRec.Longitude || newRec.longitude || '')
                
                if (isNaN(oldLat) || isNaN(oldLng) || isNaN(newLat) || isNaN(newLng)) return false
                
                return Math.abs(oldLat - newLat) > 0.0001 || Math.abs(oldLng - newLng) > 0.0001
              }

              // Only process if coordinates are involved
              if (payload.eventType === 'INSERT' && hasCoordinates(newRecord)) {
                // New project with coordinates
                console.log('➕ New project with coordinates detected')
                setTimeout(() => {
                  checkForNewProjects()
                }, 500)
              } else if (payload.eventType === 'UPDATE') {
                // Check if coordinates were added or changed
                const hadCoordinates = hasCoordinates(oldRecord)
                const hasCoordinatesNow = hasCoordinates(newRecord)
                const coordsChanged = coordinatesChanged(oldRecord, newRecord)
                
                console.log('🔄 Project updated:', { hadCoordinates, hasCoordinatesNow, coordsChanged })
                
                if (!hadCoordinates && hasCoordinatesNow) {
                  // Coordinates were added
                  console.log('📍 Coordinates were added to project')
                  setTimeout(() => {
                    checkForNewProjects()
                  }, 500)
                } else if (hadCoordinates && hasCoordinatesNow && coordsChanged) {
                  // Coordinates were updated - sync and refresh locations
                  console.log('📍 Coordinates were updated, syncing locations...')
                  syncLocationsWithProjects().then(() => {
                    setTimeout(() => {
                      checkForNewProjects()
                    }, 1000)
                  }).catch(err => {
                    console.error('❌ Error in sync after update:', err)
                  })
                } else if (hadCoordinates && hasCoordinatesNow) {
                  // Project updated but coordinates didn't change - still sync to be safe
                  console.log('🔄 Project updated, syncing locations to be safe...')
                  setTimeout(() => {
                    syncLocationsWithProjects()
                  }, 1000)
                }
              } else if (payload.eventType === 'DELETE' && hasCoordinates(oldRecord)) {
                // Project with coordinates was deleted - refresh
                console.log('🗑️ Project with coordinates deleted')
                fetchLocations()
              }
            }
          )
          .subscribe((status) => {
            console.log('Subscription status:', status)
          })

        return channel
      } catch (error) {
        console.error('Error setting up realtime subscription:', error)
        return null
      }
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabaseClient.removeChannel(channel)
      }
    }
  }, [])

  // Load ignored projects from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ignored_project_locations')
    if (saved) {
      try {
        setIgnoredProjects(new Set(JSON.parse(saved)))
      } catch (e) {
        console.error('Error loading ignored projects:', e)
      }
    }
  }, [])

  const checkForNewProjects = async () => {
    try {
      // Fetch all projects with valid coordinates
      const { data: projects, error: projectsError } = await (supabaseClient
        .from(TABLES.PROJECTS) as any)
        .select('*')
        .not('Latitude', 'is', null)
        .not('Longitude', 'is', null)
        .neq('Latitude', '')
        .neq('Longitude', '')

      if (projectsError) {
        console.error('Error fetching projects:', projectsError)
        return
      }

      if (!projects || projects.length === 0) return

      // Get all existing location names
      const existingLocationNames = new Set(
        locations.map(loc => loc.name.toLowerCase())
      )

      // Find new projects that don't have corresponding locations
      const newProjects = projects.filter((project: any) => {
        const lat = parseFloat(project.Latitude || project.latitude || '')
        const lng = parseFloat(project.Longitude || project.longitude || '')
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return false
        }

        const projectCode = project['Project Code'] || project.project_code || ''
        const projectName = project['Project Name'] || project.project_name || ''
        const fullName = projectCode ? `${projectCode} - ${projectName}` : projectName
        const locationName = fullName.toLowerCase()

        // Check if already exists as location
        if (existingLocationNames.has(locationName)) {
          return false
        }

        // Check if project was ignored
        const projectId = project.id || projectCode
        if (ignoredProjects.has(projectId)) {
          return false
        }

        return true
      })

      // Store all pending projects
      const formattedPendingProjects = newProjects.map((project: any) => {
        const projectCode = project['Project Code'] || project.project_code || ''
        const projectName = project['Project Name'] || project.project_name || 'Unknown Project'
        const lat = parseFloat(project.Latitude || project.latitude || '0')
        const lng = parseFloat(project.Longitude || project.longitude || '0')
        const fullName = projectCode ? `${projectCode} - ${projectName}` : projectName

        return {
          id: project.id || projectCode,
          project_code: projectCode,
          project_name: projectName,
          name: fullName,
          latitude: lat,
          longitude: lng,
          description: `Project location: ${projectName}${projectCode ? ` (${projectCode})` : ''}`,
          created_at: project.created_at || new Date().toISOString(),
          project_status: project['Project Status'] || project.project_status || 'Unknown'
        }
      })

      setPendingProjects(formattedPendingProjects)

      // If there's a new project and no notification is currently showing
      if (formattedPendingProjects.length > 0 && !newProjectLocation) {
        // Show the first new project
        setNewProjectLocation(formattedPendingProjects[0])
      }
    } catch (err) {
      console.error('Error checking for new projects:', err)
    }
  }

  const handleAddNewProjectLocation = async () => {
    if (!newProjectLocation) return

    try {
      setError('')
      setSuccess('')

      const locationData = {
        name: newProjectLocation.name,
        latitude: newProjectLocation.latitude,
        longitude: newProjectLocation.longitude,
        radius_meters: 100,
        description: newProjectLocation.description,
        is_active: true
      }

      const { error: insertError } = await supabase
        .from(TABLES.ATTENDANCE_LOCATIONS)
        // @ts-ignore
        .insert([locationData])

      if (insertError) throw insertError

      setSuccess('Location added successfully!')
      setNewProjectLocation(null)
      await fetchLocations()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to add location: ' + err.message)
      console.error('Error adding location:', err)
    }
  }

  const handleIgnoreNewProject = () => {
    if (!newProjectLocation) return

    const projectId = newProjectLocation.id
    const newIgnored = new Set(ignoredProjects)
    newIgnored.add(projectId)
    setIgnoredProjects(newIgnored)
    
    // Save to localStorage
    localStorage.setItem('ignored_project_locations', JSON.stringify(Array.from(newIgnored)))
    
    // Remove from pending projects
    setPendingProjects(prev => prev.filter(p => p.id !== projectId))
    
    // Show next pending project or clear
    if (pendingProjects.length > 1) {
      const remaining = pendingProjects.filter(p => p.id !== projectId)
      setNewProjectLocation(remaining[0] || null)
    } else {
      setNewProjectLocation(null)
    }
  }

  const handleAddAllPending = async () => {
    if (pendingProjects.length === 0) return

    try {
      setError('')
      setSuccess('')

      const locationsToAdd = pendingProjects.map(project => ({
        name: project.name,
        latitude: project.latitude,
        longitude: project.longitude,
        radius_meters: 100,
        description: project.description,
        is_active: true
      }))

      const { error: insertError } = await supabase
        .from(TABLES.ATTENDANCE_LOCATIONS)
        // @ts-ignore
        .insert(locationsToAdd)

      if (insertError) throw insertError

      setSuccess(`Successfully added ${locationsToAdd.length} location(s)!`)
      setPendingProjects([])
      setNewProjectLocation(null)
      await fetchLocations()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to add locations: ' + err.message)
      console.error('Error adding locations:', err)
    }
  }

  const handleIgnoreAllPending = () => {
    const allIds = pendingProjects.map(p => p.id)
    const newIgnored = new Set([...Array.from(ignoredProjects), ...allIds])
    setIgnoredProjects(newIgnored)
    localStorage.setItem('ignored_project_locations', JSON.stringify(Array.from(newIgnored)))
    setPendingProjects([])
    setNewProjectLocation(null)
  }

  const handleClearIgnored = () => {
    if (confirm('Are you sure you want to clear all ignored projects? They will appear again if they are still pending.')) {
      setIgnoredProjects(new Set())
      localStorage.removeItem('ignored_project_locations')
      // Re-check for new projects
      setTimeout(() => {
        checkForNewProjects()
      }, 500)
    }
  }

  const [ignoredProjectsList, setIgnoredProjectsList] = useState<any[]>([])

  const fetchIgnoredProjects = async () => {
    if (ignoredProjects.size === 0) {
      setIgnoredProjectsList([])
      return
    }

    try {
      const { data: projects, error: projectsError } = await (supabaseClient
        .from(TABLES.PROJECTS) as any)
        .select('*')
        .not('Latitude', 'is', null)
        .not('Longitude', 'is', null)
        .neq('Latitude', '')
        .neq('Longitude', '')

      if (projectsError) {
        console.error('Error fetching projects:', projectsError)
        return
      }

      if (!projects || projects.length === 0) {
        setIgnoredProjectsList([])
        return
      }

      const ignored = projects
        .filter((project: any) => {
          const projectId = project.id || (project['Project Code'] || project.project_code || '')
          return ignoredProjects.has(projectId)
        })
        .map((project: any) => {
          const projectCode = project['Project Code'] || project.project_code || ''
          const projectName = project['Project Name'] || project.project_name || 'Unknown Project'
          const lat = parseFloat(project.Latitude || project.latitude || '0')
          const lng = parseFloat(project.Longitude || project.longitude || '0')
          const fullName = projectCode ? `${projectCode} - ${projectName}` : projectName

          return {
            id: project.id || projectCode,
            project_code: projectCode,
            project_name: projectName,
            name: fullName,
            latitude: lat,
            longitude: lng,
            description: `Project location: ${projectName}${projectCode ? ` (${projectCode})` : ''}`,
            created_at: project.created_at || new Date().toISOString(),
            project_status: project['Project Status'] || project.project_status || 'Unknown'
          }
        })

      setIgnoredProjectsList(ignored)
    } catch (err) {
      console.error('Error fetching ignored projects:', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchIgnoredProjects()
    }
  }, [activeTab, ignoredProjects])

  const handleRestoreIgnored = (projectId: string) => {
    const newIgnored = new Set(Array.from(ignoredProjects))
    newIgnored.delete(projectId)
    setIgnoredProjects(newIgnored)
    localStorage.setItem('ignored_project_locations', JSON.stringify(Array.from(newIgnored)))
    // Re-check for new projects
    setTimeout(() => {
      checkForNewProjects()
    }, 500)
  }

  const handleRestoreAllIgnored = () => {
    if (confirm('Are you sure you want to restore all ignored projects? They will appear in pending list again.')) {
      setIgnoredProjects(new Set())
      localStorage.removeItem('ignored_project_locations')
      // Re-check for new projects
      setTimeout(() => {
        checkForNewProjects()
      }, 500)
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting current location:', error)
        }
      )
    }
  }

  const fetchLocations = async () => {
    try {
      setLoading(true)
      setError('')
      const { data, error: fetchError } = await supabase
        .from(TABLES.ATTENDANCE_LOCATIONS)
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setLocations(data || [])
    } catch (err: any) {
      setError('Failed to load locations: ' + err.message)
      console.error('Error fetching locations:', err)
    } finally {
      setLoading(false)
    }
  }

  const syncLocationsWithProjects = async () => {
    try {
      // Fetch all projects with valid coordinates
      const { data: projects, error: projectsError } = await (supabaseClient
        .from(TABLES.PROJECTS) as any)
        .select('*')
        .not('Latitude', 'is', null)
        .not('Longitude', 'is', null)
        .neq('Latitude', '')
        .neq('Longitude', '')

      if (projectsError) {
        console.error('Error fetching projects for sync:', projectsError)
        return
      }

      if (!projects || projects.length === 0) return

      // Get all existing locations
      const { data: existingLocations, error: locationsError } = await supabase
        .from(TABLES.ATTENDANCE_LOCATIONS)
        // @ts-ignore
        .select('*')

      if (locationsError) {
        console.error('Error fetching locations for sync:', locationsError)
        return
      }

      const locationMap = new Map(
        (existingLocations || []).map((loc: AttendanceLocation) => [loc.name.toLowerCase().trim(), loc])
      )

      // Find projects that match existing locations and update them
      let updateCount = 0
      
      for (const project of projects) {
        const lat = parseFloat(project.Latitude || project.latitude || '')
        const lng = parseFloat(project.Longitude || project.longitude || '')
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          continue
        }

        const projectCode = project['Project Code'] || project.project_code || ''
        const projectName = project['Project Name'] || project.project_name || ''
        const fullName = projectCode ? `${projectCode} - ${projectName}` : projectName
        const locationName = fullName.toLowerCase().trim()

        // Try multiple matching strategies
        let existingLocation = locationMap.get(locationName)
        
        // If not found, try matching by project code only
        if (!existingLocation && projectCode) {
          const projectCodeLower = projectCode.toLowerCase().trim()
          for (const loc of Array.from(locationMap.values())) {
            if (loc.name.toLowerCase().trim().includes(projectCodeLower)) {
              existingLocation = loc
              console.log(`📍 Found location by project code match: "${loc.name}" matches "${projectCode}"`)
              break
            }
          }
        }
        
        // If still not found, try matching by project name
        if (!existingLocation && projectName) {
          const projectNameLower = projectName.toLowerCase().trim()
          for (const loc of Array.from(locationMap.values())) {
            const locNameLower = loc.name.toLowerCase().trim()
            if (locNameLower.includes(projectNameLower) || projectNameLower.includes(locNameLower)) {
              existingLocation = loc
              console.log(`📍 Found location by project name match: "${loc.name}" matches "${projectName}"`)
              break
            }
          }
        }
        
        if (existingLocation) {
          // Check if coordinates changed
          const currentLat = parseFloat(existingLocation.latitude.toString())
          const currentLng = parseFloat(existingLocation.longitude.toString())
          
          const latDiff = Math.abs(currentLat - lat)
          const lngDiff = Math.abs(currentLng - lng)
          
          if (latDiff > 0.0001 || lngDiff > 0.0001) {
            // Coordinates changed, update the location
            console.log(`🔄 Updating location "${existingLocation.name}": (${currentLat}, ${currentLng}) -> (${lat}, ${lng})`)
            try {
              const { error: updateError } = await supabase
                .from(TABLES.ATTENDANCE_LOCATIONS)
                // @ts-ignore
                .update({
                  latitude: lat,
                  longitude: lng,
                  description: `Project location: ${projectName}${projectCode ? ` (${projectCode})` : ''}`
                })
                .eq('id', existingLocation.id)

              if (updateError) {
                console.error('❌ Error updating location:', updateError)
                setError(`Failed to update location "${existingLocation.name}": ${updateError.message}`)
              } else {
                updateCount++
                console.log(`✅ Successfully updated location "${existingLocation.name}"`)
              }
            } catch (err: any) {
              console.error('❌ Error updating location:', err)
              setError(`Failed to update location: ${err.message}`)
            }
          } else {
            console.log(`ℹ️ Location "${existingLocation.name}" coordinates unchanged`)
          }
        } else {
          console.log(`ℹ️ No matching location found for project "${fullName}"`)
        }
      }

      if (updateCount > 0) {
        console.log(`Updated ${updateCount} location(s) with new coordinates`)
        // Refresh locations
        await fetchLocations()
        setSuccess(`Updated ${updateCount} location(s) with new coordinates`)
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      console.error('Error syncing locations with projects:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      setSuccess('')

      const locationData = {
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius_meters: parseInt(formData.radius_meters),
        description: formData.description || null,
        is_active: formData.is_active
      }

      if (editingLocation) {
        // Update existing location
        const { error: updateError } = await supabase
          .from(TABLES.ATTENDANCE_LOCATIONS)
          // @ts-ignore - Attendance tables not in Supabase types yet
          .update(locationData)
          .eq('id', editingLocation.id)

        if (updateError) throw updateError
        setSuccess('Location updated successfully!')
      } else {
        // Add new location
        const { error: insertError } = await supabase
          .from(TABLES.ATTENDANCE_LOCATIONS)
          // @ts-ignore - Attendance tables not in Supabase types yet
          .insert([locationData])

        if (insertError) throw insertError
        setSuccess('Location added successfully!')
      }

      setShowAddForm(false)
      setEditingLocation(null)
      setFormData({
        name: '',
        latitude: '',
        longitude: '',
        radius_meters: '100',
        description: '',
        is_active: true
      })
      setMapUrl('')
      fetchLocations()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to save location: ' + err.message)
      console.error('Error saving location:', err)
    }
  }

  const handleEdit = (location: AttendanceLocation) => {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radius_meters: location.radius_meters.toString(),
      description: location.description || '',
      is_active: location.is_active
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return

    try {
      setError('')
      const { error: deleteError } = await supabase
        .from(TABLES.ATTENDANCE_LOCATIONS)
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      setSuccess('Location deleted successfully!')
      fetchLocations()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete location: ' + err.message)
      console.error('Error deleting location:', err)
    }
  }

  const useCurrentLocation = () => {
    if (currentLocation) {
      setFormData(prev => ({
        ...prev,
        latitude: currentLocation.lat.toFixed(8),
        longitude: currentLocation.lng.toFixed(8)
      }))
    } else {
      alert('Current location not available. Please enable GPS.')
      getCurrentLocation()
    }
  }

  const extractCoordinatesFromUrl = async () => {
    if (!mapUrl.trim()) {
      setError('Please enter a map URL')
      return
    }

    setIsExtracting(true)
    setError('')
    setSuccess('')

    try {
      let lat: number | null = null
      let lng: number | null = null

      // Google Maps URL patterns
      // https://www.google.com/maps?q=30.0444,31.2357
      // https://www.google.com/maps/@30.0444,31.2357,15z
      // https://maps.google.com/?q=30.0444,31.2357
      // https://www.google.com/maps/place/.../@30.0444,31.2357,15z
      
      // Try to extract from query parameter ?q=
      const qMatch = mapUrl.match(/[?&]q=([^&]+)/)
      if (qMatch) {
        const coords = qMatch[1].split(',')
        if (coords.length >= 2) {
          lat = parseFloat(coords[0].trim())
          lng = parseFloat(coords[1].trim())
        }
      }

      // Try to extract from @lat,lng pattern
      if (!lat || !lng) {
        const atMatch = mapUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
        if (atMatch) {
          lat = parseFloat(atMatch[1])
          lng = parseFloat(atMatch[2])
        }
      }

      // Try to extract from /place/.../@lat,lng pattern
      if (!lat || !lng) {
        const placeMatch = mapUrl.match(/\/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
        if (placeMatch) {
          lat = parseFloat(placeMatch[1])
          lng = parseFloat(placeMatch[2])
        }
      }

      // Try to extract from /dir/.../@lat,lng pattern
      if (!lat || !lng) {
        const dirMatch = mapUrl.match(/\/dir\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
        if (dirMatch) {
          lat = parseFloat(dirMatch[1])
          lng = parseFloat(dirMatch[2])
        }
      }

      // Validate coordinates
      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        throw new Error('Could not extract coordinates from URL. Please check the URL format.')
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.')
      }

      // Update form data
      setFormData(prev => ({
        ...prev,
        latitude: lat!.toFixed(8),
        longitude: lng!.toFixed(8)
      }))

      setSuccess('Coordinates extracted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to extract coordinates from URL')
      console.error('Error extracting coordinates:', err)
    } finally {
      setIsExtracting(false)
    }
  }

  const openLocationInMaps = (location: AttendanceLocation) => {
    // Open in Google Maps
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const toggleFavorite = async (location: AttendanceLocation) => {
    try {
      setError('')
      const newFavoriteStatus = !location.is_favorite
      
      const { error: updateError } = await supabase
        .from(TABLES.ATTENDANCE_LOCATIONS)
        // @ts-ignore
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', location.id)

      if (updateError) throw updateError
      
      setSuccess(newFavoriteStatus ? 'Location marked as favorite!' : 'Location unmarked from favorites')
      fetchLocations()
      setTimeout(() => setSuccess(''), 2000)
    } catch (err: any) {
      setError('Failed to update favorite status: ' + err.message)
      console.error('Error updating favorite:', err)
    }
  }

  const handleImportFromProjects = async () => {
    if (!confirm('This will import all projects with valid coordinates as attendance locations. Existing locations with the same name will be updated. Continue?')) {
      return
    }

    setIsImportingFromProjects(true)
    setError('')
    setSuccess('')

    try {
      // Fetch all projects with valid coordinates
      const { data: projects, error: projectsError } = await (supabaseClient
        .from(TABLES.PROJECTS) as any)
        .select('*')
        .not('Latitude', 'is', null)
        .not('Longitude', 'is', null)
        .neq('Latitude', '')
        .neq('Longitude', '')

      if (projectsError) throw projectsError

      if (!projects || projects.length === 0) {
        setError('No projects with valid coordinates found')
        setIsImportingFromProjects(false)
        return
      }

      // Convert projects to attendance locations format
      const locationsToImport: Partial<AttendanceLocation>[] = projects
        .filter((project: any) => {
          // Validate that coordinates are valid numbers
          const lat = parseFloat(project.Latitude || project.latitude || '')
          const lng = parseFloat(project.Longitude || project.longitude || '')
          return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
        })
        .map((project: any) => {
          const lat = parseFloat(project.Latitude || project.latitude || '0')
          const lng = parseFloat(project.Longitude || project.longitude || '0')
          const projectName = project['Project Name'] || project.project_name || project['Project Code'] || project.project_code || 'Unknown Project'
          const projectCode = project['Project Code'] || project.project_code || ''
          const fullName = projectCode ? `${projectCode} - ${projectName}` : projectName

          return {
            name: fullName,
            latitude: lat,
            longitude: lng,
            radius_meters: 100, // Default radius
            description: `Project location: ${projectName}${projectCode ? ` (${projectCode})` : ''}`,
            is_active: true
          }
        })

      if (locationsToImport.length === 0) {
        setError('No valid project coordinates found to import')
        setIsImportingFromProjects(false)
        return
      }

      // Use upsert to insert or update locations based on name
      // Note: Since we can't use name as unique constraint easily, we'll insert new ones
      // and let the user manage duplicates manually
      const { data: importedData, error: importError } = await supabase
        .from(TABLES.ATTENDANCE_LOCATIONS)
        // @ts-ignore
        .insert(locationsToImport)
        .select()

      if (importError) {
        // If error is due to duplicates, try to update existing ones
        if (importError.code === '23505' || importError.message.includes('duplicate')) {
          // Try inserting one by one, skipping duplicates
          let successCount = 0
          for (const location of locationsToImport) {
            try {
              const { error: singleError } = await supabase
                .from(TABLES.ATTENDANCE_LOCATIONS)
                // @ts-ignore
                .insert([location])
              
              if (!singleError) successCount++
            } catch (err) {
              // Skip duplicates
              continue
            }
          }
          setSuccess(`Successfully imported ${successCount} location(s) from projects`)
        } else {
          throw importError
        }
      } else {
        setSuccess(`Successfully imported ${importedData?.length || 0} location(s) from projects`)
      }

      await fetchLocations()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError('Failed to import from projects: ' + err.message)
      console.error('Error importing from projects:', err)
    } finally {
      setIsImportingFromProjects(false)
    }
  }

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFavorite = !filterFavorites || loc.is_favorite === true
    return matchesSearch && matchesFavorite
  })

  if (loading && locations.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-green-500" />
            Locations Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage GPS locations for attendance tracking
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-2">
        <Button
          variant={activeTab === 'locations' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('locations')}
          size="sm"
          className="flex items-center gap-2"
        >
          <MapPin className="h-4 w-4" />
          Locations
        </Button>
        <Button
          variant={activeTab === 'notifications' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('notifications')}
          size="sm"
          className="flex items-center gap-2 relative"
        >
          <Bell className="h-4 w-4" />
          Notifications
          {pendingProjects.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {pendingProjects.length}
            </span>
          )}
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'notifications' ? (
        <div className="space-y-6">
          {/* Notifications Tab Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Pending Project Locations ({pendingProjects.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  {pendingProjects.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleIgnoreAllPending}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Ignore All
                      </Button>
                      <PermissionButton
                        permission="hr.attendance.locations.create"
                        variant="primary"
                        size="sm"
                        onClick={handleAddAllPending}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add All
                      </PermissionButton>
                    </>
                  )}
                  {ignoredProjects.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearIgnored}
                      className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                      title="Clear ignored projects to see them again"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Clear Ignored ({ignoredProjects.size})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pendingProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No pending project locations</p>
                  <p className="text-sm text-gray-400 mt-2">New projects with coordinates will appear here</p>
                  {ignoredProjects.size > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-2">
                        You have {ignoredProjects.size} ignored project(s). Clear them to see them again.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearIgnored}
                        className="flex items-center gap-2 mx-auto"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Clear Ignored Projects
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingProjects.map((project) => (
                    <Card key={project.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-lg">{project.name}</h3>
                              {project.project_code && (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">
                                  {project.project_code}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {project.description}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Latitude</label>
                                <p className="font-mono text-sm font-medium">{project.latitude.toFixed(6)}</p>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Longitude</label>
                                <p className="font-mono text-sm font-medium">{project.longitude.toFixed(6)}</p>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
                                <p className="text-sm">{project.project_status || 'Unknown'}</p>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Created</label>
                                <p className="text-sm">
                                  {new Date(project.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openLocationInMaps({
                                  id: project.id,
                                  name: project.name,
                                  latitude: project.latitude,
                                  longitude: project.longitude,
                                  radius_meters: 100,
                                  is_active: true
                                } as AttendanceLocation)}
                                className="flex items-center gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                View on Map
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newIgnored = new Set(ignoredProjects)
                                  newIgnored.add(project.id)
                                  setIgnoredProjects(newIgnored)
                                  localStorage.setItem('ignored_project_locations', JSON.stringify(Array.from(newIgnored)))
                                  setPendingProjects(prev => prev.filter(p => p.id !== project.id))
                                  if (newProjectLocation?.id === project.id) {
                                    setNewProjectLocation(null)
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <X className="h-4 w-4" />
                                Ignore
                              </Button>
                              <PermissionButton
                                permission="hr.attendance.locations.create"
                                variant="primary"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const locationData = {
                                      name: project.name,
                                      latitude: project.latitude,
                                      longitude: project.longitude,
                                      radius_meters: 100,
                                      description: project.description,
                                      is_active: true
                                    }

                                    const { error: insertError } = await supabase
                                      .from(TABLES.ATTENDANCE_LOCATIONS)
                                      // @ts-ignore
                                      .insert([locationData])

                                    if (insertError) throw insertError

                                    setPendingProjects(prev => prev.filter(p => p.id !== project.id))
                                    if (newProjectLocation?.id === project.id) {
                                      setNewProjectLocation(null)
                                    }
                                    await fetchLocations()
                                    setSuccess('Location added successfully!')
                                    setTimeout(() => setSuccess(''), 3000)
                                  } catch (err: any) {
                                    setError('Failed to add location: ' + err.message)
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <Plus className="h-4 w-4" />
                                Add Location
                              </PermissionButton>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ignored Projects Section */}
          {ignoredProjects.size > 0 && (
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <X className="h-5 w-5 text-orange-500" />
                    Ignored Project Locations ({ignoredProjects.size})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRestoreAllIgnored}
                    className="flex items-center gap-2 text-green-600 hover:text-green-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Restore All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {ignoredProjectsList.length === 0 ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-gray-500">Loading ignored projects...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ignoredProjectsList.map((project) => (
                      <Card key={project.id} className="border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium text-lg">{project.name}</h3>
                                {project.project_code && (
                                  <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs font-mono">
                                    {project.project_code}
                                  </span>
                                )}
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs">
                                  Ignored
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {project.description}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400">Latitude</label>
                                  <p className="font-mono text-sm font-medium">{project.latitude.toFixed(6)}</p>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400">Longitude</label>
                                  <p className="font-mono text-sm font-medium">{project.longitude.toFixed(6)}</p>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
                                  <p className="text-sm">{project.project_status || 'Unknown'}</p>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 dark:text-gray-400">Created</label>
                                  <p className="text-sm">
                                    {new Date(project.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openLocationInMaps({
                                    id: project.id,
                                    name: project.name,
                                    latitude: project.latitude,
                                    longitude: project.longitude,
                                    radius_meters: 100,
                                    is_active: true
                                  } as AttendanceLocation)}
                                  className="flex items-center gap-2"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View on Map
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleRestoreIgnored(project.id)}
                                  className="flex items-center gap-2"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  Restore
                                </Button>
                                <PermissionButton
                                  permission="hr.attendance.locations.create"
                                  variant="primary"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const locationData = {
                                        name: project.name,
                                        latitude: project.latitude,
                                        longitude: project.longitude,
                                        radius_meters: 100,
                                        description: project.description,
                                        is_active: true
                                      }

                                      const { error: insertError } = await supabase
                                        .from(TABLES.ATTENDANCE_LOCATIONS)
                                        // @ts-ignore
                                        .insert([locationData])

                                      if (insertError) throw insertError

                                      // Remove from ignored
                                      handleRestoreIgnored(project.id)
                                      await fetchLocations()
                                      setSuccess('Location added successfully!')
                                      setTimeout(() => setSuccess(''), 3000)
                                    } catch (err: any) {
                                      setError('Failed to add location: ' + err.message)
                                    }
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add Location
                                </PermissionButton>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={handleImportFromProjects}
              disabled={isImportingFromProjects}
              className="flex items-center gap-2"
            >
              {isImportingFromProjects ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FolderKanban className="h-4 w-4" />
                  Import from Projects
                </>
              )}
            </Button>
            <PermissionButton
              permission="hr.attendance.locations.create"
              onClick={() => {
                setShowAddForm(true)
                setEditingLocation(null)
                setFormData({
                  name: '',
                  latitude: '',
                  longitude: '',
                  radius_meters: '100',
                  description: '',
                  is_active: true
                })
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </PermissionButton>
            <Button
              variant="outline"
              onClick={async () => {
                setSuccess('Syncing locations with projects...')
                await syncLocationsWithProjects()
              }}
              className="flex items-center gap-2"
              title="Sync locations with latest project coordinates"
            >
              <RefreshCw className="h-4 w-4" />
              Sync with Projects
            </Button>
          </div>

          {/* New Project Location Notification Modal */}
          {newProjectLocation && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <Card className="w-full max-w-md animate-in zoom-in-95 duration-200">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Bell className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-white">New Project Location Detected</CardTitle>
                        <p className="text-sm text-white/90 mt-1">A new project with coordinates has been added</p>
                      </div>
                    </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewProjectLocation(null)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Project Name</label>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                        <p className="font-medium">{newProjectLocation.name}</p>
                        {newProjectLocation.project_code && (
                          <p className="text-sm text-gray-500 mt-1">Code: {newProjectLocation.project_code}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Latitude</label>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          <p className="font-mono text-sm">{newProjectLocation.latitude.toFixed(6)}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Longitude</label>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          <p className="font-mono text-sm">{newProjectLocation.longitude.toFixed(6)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={handleIgnoreNewProject}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Ignore
                      </Button>
                      <PermissionButton
                        permission="hr.attendance.locations.create"
                        variant="primary"
                        onClick={handleAddNewProjectLocation}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location
                      </PermissionButton>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {locations.filter(loc => loc.is_favorite).length} favorites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Radio className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {locations.filter(loc => loc.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <MapPin className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {locations.filter(loc => !loc.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingLocation(null)
                  setFormData({
                    name: '',
                    latitude: '',
                    longitude: '',
                    radius_meters: '100',
                    description: '',
                    is_active: true
                  })
                  setMapUrl('')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Location Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Main Office"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Radius (Meters) *</label>
                  <Input
                    type="number"
                    value={formData.radius_meters}
                    onChange={(e) => setFormData(prev => ({ ...prev, radius_meters: e.target.value }))}
                    required
                    min="10"
                    placeholder="100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Map URL (Optional)</label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={mapUrl}
                      onChange={(e) => setMapUrl(e.target.value)}
                      placeholder="https://www.google.com/maps?q=30.0444,31.2357"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={extractCoordinatesFromUrl}
                      disabled={isExtracting || !mapUrl.trim()}
                      title="Extract coordinates from URL"
                      className="flex items-center gap-2"
                    >
                      {isExtracting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      Extract
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Paste a Google Maps URL to automatically extract coordinates
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Latitude *</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                      required
                      placeholder="30.0444"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={useCurrentLocation}
                      title="Use current location"
                    >
                      <Navigation className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Longitude *</label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                    required
                    placeholder="31.2357"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Location description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingLocation(null)
                  }}
                >
                  Cancel
                </Button>
                <PermissionButton
                  permission={editingLocation ? 'hr.attendance.locations.edit' : 'hr.attendance.locations.create'}
                  type="submit"
                >
                  {editingLocation ? 'Update' : 'Add'} Location
                </PermissionButton>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={filterFavorites ? "primary" : "outline"}
              onClick={() => setFilterFavorites(!filterFavorites)}
              className="flex items-center gap-2"
            >
              <Star className={`h-4 w-4 ${filterFavorites ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              {filterFavorites ? 'Show All' : 'Favorites Only'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Locations List */}
      <Card>
        <CardHeader>
          <CardTitle>Locations ({filteredLocations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((location) => (
                <div key={location.id} className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  location.is_favorite ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                }`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      location.is_active ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <MapPin className={`h-6 w-6 ${
                        location.is_active ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{location.name}</h3>
                        {location.is_favorite && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{location.description || 'No description'}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Radio className="h-4 w-4" />
                          {location.radius_meters}m radius
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      location.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {location.is_active ? 'Active' : 'Inactive'}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFavorite(location)}
                      title={location.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      className={location.is_favorite ? 'text-yellow-600 hover:text-yellow-700' : ''}
                    >
                      <Star className={`h-4 w-4 ${location.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openLocationInMaps(location)}
                      title="Open in Google Maps"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    
                    <PermissionButton
                      permission="hr.attendance.locations.edit"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(location)}
                      title="Edit location"
                    >
                      <Edit className="h-4 w-4" />
                    </PermissionButton>
                    
                    <PermissionButton
                      permission="hr.attendance.locations.delete"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(location.id)}
                      title="Delete location"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </PermissionButton>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(location.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete location"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No locations found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        </div>
      )}

      {/* Floating Notification Icon */}
      {pendingProjects.length > 0 && (
        <button
          onClick={() => setActiveTab('notifications')}
          className="fixed bottom-6 right-6 z-40 group"
          title={`${pendingProjects.length} new project location(s) detected - Click to view`}
        >
          <div className="relative">
            {/* Outer pulsing rings */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full animate-pulse opacity-30"></div>
            
            {/* Main button */}
            <div className="relative bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 text-white p-5 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-110 group-hover:from-blue-600 group-hover:via-purple-600 group-hover:to-purple-700 transform hover:rotate-3">
              <div className="relative flex items-center justify-center">
                {/* Bell icon with swing animation */}
                <Bell className="h-7 w-7 animate-swing drop-shadow-lg" />
                
                {/* Notification badge with pulse */}
                <span className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-red-600 text-white text-sm font-bold rounded-full h-7 w-7 flex items-center justify-center border-3 border-white shadow-lg animate-bounce">
                  {pendingProjects.length > 9 ? '9+' : pendingProjects.length}
                </span>
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/50 to-purple-500/50 blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300 -z-10"></div>
              </div>
            </div>
            
            {/* Tooltip */}
            <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-gray-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap transform translate-x-2 group-hover:translate-x-0">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>{pendingProjects.length} new project location{pendingProjects.length > 1 ? 's' : ''} detected</span>
              </div>
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900 dark:border-l-gray-800"></div>
            </div>
          </div>
        </button>
      )}
    </div>
  )
}

