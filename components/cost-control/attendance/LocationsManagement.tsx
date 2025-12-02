'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  MapPin, Plus, Edit, Trash2, Search, X, CheckCircle, AlertCircle,
  Navigation, Radio, Globe
} from 'lucide-react'
import { supabase, TABLES, AttendanceLocation } from '@/lib/supabase'

export function LocationsManagement() {
  const [locations, setLocations] = useState<AttendanceLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
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
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    fetchLocations()
    getCurrentLocation()
  }, [])

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

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        <Button onClick={() => {
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
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          {success}
        </Alert>
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
                <Button type="submit">
                  {editingLocation ? 'Update' : 'Add'} Location
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      location.is_active ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <MapPin className={`h-6 w-6 ${
                        location.is_active ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{location.name}</h3>
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
                      onClick={() => handleEdit(location)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(location.id)}
                      className="text-red-600 hover:text-red-700"
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
  )
}

