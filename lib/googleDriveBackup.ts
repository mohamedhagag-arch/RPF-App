/**
 * 📁 Google Drive Backup Manager
 * 
 * مدير النسخ الاحتياطي على Google Drive
 * يوفر رفع تلقائي للنسخ الاحتياطية على Google Drive
 */

import { BackupData } from './backupManager'

export interface GoogleDriveConfig {
  accessToken: string
  refreshToken?: string
  folderId?: string // Optional: specific folder ID, otherwise uses root
}

export interface GoogleDriveBackupResult {
  success: boolean
  message: string
  fileId?: string
  fileUrl?: string
  folderId?: string
  error?: string
}

/**
 * رفع نسخة احتياطية إلى Google Drive
 */
export async function uploadBackupToGoogleDrive(
  backup: BackupData,
  config: GoogleDriveConfig
): Promise<GoogleDriveBackupResult> {
  try {
    console.log('📁 Uploading backup to Google Drive...')
    console.log('📊 Config:', { 
      hasAccessToken: !!config.accessToken,
      hasFolderId: !!config.folderId,
      folderId: config.folderId 
    })

    // تحويل backup إلى JSON string
    const backupJson = JSON.stringify(backup, null, 2)
    const backupSize = Buffer.byteLength(backupJson, 'utf8')
    console.log(`📦 Backup size: ${(backupSize / 1024).toFixed(2)} KB`)
    
    const backupBlob = new Blob([backupJson], { type: 'application/json' })
    
    // إنشاء اسم الملف
    const date = new Date(backup.timestamp)
    const dateStr = date.toISOString().split('T')[0]
    const filename = `database_backup_${dateStr}_${date.getHours()}${date.getMinutes()}.json`
    console.log(`📝 Filename: ${filename}`)

    // رفع الملف إلى Google Drive
    // Note: In Node.js environment, we need to use a different approach
    const isNode = typeof window === 'undefined'
    console.log(`🌐 Environment: ${isNode ? 'Node.js' : 'Browser'}`)
    
    let response
    let validFolderId = config.folderId // Store for later use
    if (isNode) {
      // Node.js environment (for API routes and scripts)
      // Use resumable upload for better reliability
      // Step 1: Verify folder ID if provided (optional - don't fail if verification fails)
      if (validFolderId) {
        console.log('🔍 Verifying folder ID:', validFolderId)
        console.log('🔍 Folder ID type:', typeof validFolderId)
        console.log('🔍 Folder ID length:', validFolderId.length)
        try {
          // Try to verify folder - but don't fail if it's a shared workspace
          const folderCheck = await fetch(
            `https://www.googleapis.com/drive/v3/files/${validFolderId}?fields=id,name,mimeType&supportsAllDrives=true`,
            {
              headers: {
                'Authorization': `Bearer ${config.accessToken}`
              }
            }
          )
          
          console.log('🔍 Folder check response status:', folderCheck.status, folderCheck.statusText)
          
          if (!folderCheck.ok) {
            const errorText = await folderCheck.text()
            console.warn('⚠️ Folder verification failed (may be shared workspace):', errorText)
            console.log('ℹ️ Will attempt to upload to folder anyway - shared workspaces may not be directly verifiable')
            // Keep validFolderId and try to use it during upload
            // Shared workspaces might not be directly accessible but can still be used as parent
          } else {
            const folderData = await folderCheck.json()
            console.log('✅ Folder verified:', folderData.name, 'ID:', folderData.id)
            console.log('✅ Folder MIME type:', folderData.mimeType)
            
            // Verify it's actually a folder
            if (folderData.mimeType !== 'application/vnd.google-apps.folder') {
              console.warn('⚠️ WARNING: The provided ID is not a folder! MIME type:', folderData.mimeType)
            }
          }
        } catch (error: any) {
          console.warn('⚠️ Error verifying folder ID (may be shared workspace):', error.message)
          console.log('ℹ️ Will attempt to upload to folder anyway - shared workspaces may require different permissions')
          // Keep validFolderId and try to use it during upload
        }
      } else {
        console.log('⚠️ No folder ID provided - will upload to root folder')
      }
      
      // Step 2: Create file metadata
      const metadata: any = {
        name: filename
      }
      
      // Add parents only if folder ID is valid
      if (validFolderId) {
        metadata.parents = [validFolderId]
        console.log(`📋 File will be uploaded to folder: ${validFolderId}`)
      } else {
        console.log('📋 File will be uploaded to root folder (My Drive)')
      }
      
      console.log('📋 File metadata:', JSON.stringify(metadata, null, 2))
      
      // Step 2: Start resumable upload session
      // Note: For shared workspaces, we need to include supportsAllDrives=true
      const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'application/json',
          'X-Upload-Content-Length': backupSize.toString()
        },
        body: JSON.stringify(metadata)
      })
      
      if (!initResponse.ok) {
        const errorText = await initResponse.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: { message: errorText || 'Unknown error' } }
        }
        console.error('❌ Failed to initialize upload:', {
          status: initResponse.status,
          statusText: initResponse.statusText,
          error: errorData,
          metadata: metadata
        })
        throw new Error(errorData.error?.message || `Failed to initialize upload: ${initResponse.statusText}`)
      }
      
      const uploadUrl = initResponse.headers.get('Location')
      if (!uploadUrl) {
        throw new Error('No upload URL received from Google Drive')
      }
      
      console.log('✅ Upload session initialized')
      console.log('📤 Upload URL:', uploadUrl)
      console.log('📋 Metadata used:', JSON.stringify(metadata, null, 2))
      console.log('📁 Folder ID in metadata:', metadata.parents?.[0] || 'none (root)')
      
      // Step 3: Upload file data
      response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': backupSize.toString()
        },
        body: backupJson
      })
      
      console.log('📥 Upload response status:', response.status, response.statusText)
    } else {
      // Browser environment
      const formData = new FormData()
      formData.append('metadata', JSON.stringify({
        name: filename,
        parents: config.folderId ? [config.folderId] : []
      }))
      formData.append('file', backupBlob, filename)

      response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        },
        body: formData
      })
    }

    // Check response status and handle errors (read body only once)
    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: { message: errorText || 'Unknown error' } }
      }
      
      console.error('❌ Google Drive API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error || errorData,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      const errorMessage = errorData.error?.message || errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(errorMessage)
    }

    const fileData = await response.json()
    
    console.log('✅ Backup uploaded to Google Drive:', fileData.id)
    console.log('📁 File location:', validFolderId ? `Folder: ${validFolderId}` : 'Root folder (My Drive)')
    console.log('🔗 File URL:', `https://drive.google.com/file/d/${fileData.id}/view`)
    
    // Get file details to confirm location
    try {
        const fileDetails = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileData.id}?fields=id,name,parents,mimeType,webViewLink&supportsAllDrives=true`,
          {
            headers: {
              'Authorization': `Bearer ${config.accessToken}`
            }
          }
        )
      
      if (fileDetails.ok) {
        const details = await fileDetails.json()
        console.log('📋 File details after upload:', {
          name: details.name,
          parents: details.parents,
          expectedFolder: validFolderId,
          isInCorrectFolder: validFolderId ? details.parents?.includes(validFolderId) : true,
          webViewLink: details.webViewLink
        })
        
        // Verify file is in the correct folder
        if (validFolderId && details.parents && !details.parents.includes(validFolderId)) {
          console.warn('⚠️ WARNING: File uploaded but NOT in the specified folder!')
          console.warn(`   Expected folder: ${validFolderId}`)
          console.warn(`   Actual parents: ${details.parents.join(', ')}`)
          
          // Try to move file to correct folder
          try {
            console.log('🔄 Attempting to move file to correct folder...')
            
            // First, add the file to the target folder
            // Note: For shared workspaces, we need to include supportsAllDrives=true
            const addParentUrl = `https://www.googleapis.com/drive/v3/files/${fileData.id}?addParents=${validFolderId}&supportsAllDrives=true`
            console.log('📤 Adding file to folder:', addParentUrl)
            
            const addParentResponse = await fetch(addParentUrl, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
              }
            })
            
            console.log('📥 Add parent response:', addParentResponse.status, addParentResponse.statusText)
            
            if (addParentResponse.ok) {
              const updatedFile = await addParentResponse.json()
              console.log('✅ File added to target folder')
              console.log('📋 Updated file parents:', updatedFile.parents)
              
              // Verify it's now in the correct folder
              if (updatedFile.parents && updatedFile.parents.includes(validFolderId)) {
                console.log('✅ File confirmed to be in target folder after move')
                
                // Then remove from old location (if not root and if we have multiple parents)
                if (updatedFile.parents.length > 1) {
                  const oldParent = updatedFile.parents.find((p: string) => p !== validFolderId)
                  if (oldParent && oldParent !== 'root') {
                    console.log('🔄 Removing file from old location:', oldParent)
                    const removeParentResponse = await fetch(
                      `https://www.googleapis.com/drive/v3/files/${fileData.id}?removeParents=${oldParent}&supportsAllDrives=true`,
                      {
                        method: 'PATCH',
                        headers: {
                          'Authorization': `Bearer ${config.accessToken}`,
                          'Content-Type': 'application/json'
                        }
                      }
                    )
                    
                    if (removeParentResponse.ok) {
                      console.log('✅ File moved to correct folder successfully (removed from old location)')
                    } else {
                      const removeError = await removeParentResponse.text()
                      console.warn('⚠️ File added to target folder but could not remove from old location:', removeError)
                    }
                  } else {
                    console.log('✅ File added to target folder (kept in root as well)')
                  }
                }
              } else {
                console.warn('⚠️ File add succeeded but folder ID not in parents list')
              }
            } else {
              const moveError = await addParentResponse.text()
              console.error('❌ Failed to move file:', moveError)
              console.error('   Status:', addParentResponse.status)
              console.error('   Status Text:', addParentResponse.statusText)
            }
          } catch (moveError: any) {
            console.error('❌ Error moving file:', moveError.message)
            console.error('   Stack:', moveError.stack)
          }
        } else if (validFolderId && details.parents?.includes(validFolderId)) {
          console.log('✅ File confirmed to be in the correct folder')
        } else if (!validFolderId) {
          console.log('✅ File uploaded to root folder (My Drive) as expected')
        } else {
          console.warn('⚠️ Could not verify file location - no parents found')
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch file details:', error)
    }
    
    return {
      success: true,
      message: 'Backup uploaded successfully to Google Drive',
      fileId: fileData.id,
      fileUrl: `https://drive.google.com/file/d/${fileData.id}/view`,
      folderId: validFolderId || undefined
    }

  } catch (error: any) {
    console.error('❌ Error uploading to Google Drive:', error)
    return {
      success: false,
      message: `Failed to upload backup: ${error.message}`,
      error: error.message
    }
  }
}

/**
 * تحديث access token إذا انتهت صلاحيته
 */
export async function refreshGoogleDriveToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in
    }

  } catch (error: any) {
    console.error('❌ Error refreshing Google Drive token:', error)
    return null
  }
}

/**
 * إنشاء مجلد في Google Drive للنسخ الاحتياطية
 */
export async function createBackupFolder(
  config: GoogleDriveConfig,
  folderName: string = 'Database Backups'
): Promise<{ success: boolean; folderId?: string; error?: string }> {
  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: config.folderId ? [config.folderId] : []
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error?.message || `HTTP ${response.status}`)
    }

    const folderData = await response.json()
    
    return {
      success: true,
      folderId: folderData.id
    }

  } catch (error: any) {
    // إذا كان المجلد موجود بالفعل، نعيد null (لا مشكلة)
    if (error.message?.includes('duplicate')) {
      return { success: true }
    }
    
    console.error('❌ Error creating backup folder:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * حذف النسخ الاحتياطية القديمة من Google Drive (حسب retention policy)
 */
export async function cleanupOldBackups(
  config: GoogleDriveConfig,
  retentionDays: number = 30
): Promise<{ deleted: number; errors: string[] }> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    const cutoffTimestamp = cutoffDate.toISOString()

    // البحث عن الملفات القديمة
    const query = `name contains 'database_backup' and createdTime < '${cutoffTimestamp}' and trashed = false`
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime)`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`)
    }

    const data = await response.json()
    const filesToDelete = data.files || []
    
    let deleted = 0
    const errors: string[] = []

    // حذف الملفات القديمة
    for (const file of filesToDelete) {
      try {
        const deleteResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file.id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${config.accessToken}`
            }
          }
        )

        if (deleteResponse.ok) {
          deleted++
          console.log(`✅ Deleted old backup: ${file.name}`)
        } else {
          errors.push(`Failed to delete ${file.name}`)
        }
      } catch (error: any) {
        errors.push(`Error deleting ${file.name}: ${error.message}`)
      }
    }

    return { deleted, errors }

  } catch (error: any) {
    console.error('❌ Error cleaning up old backups:', error)
    return {
      deleted: 0,
      errors: [error.message]
    }
  }
}

