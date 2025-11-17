/**
 * 🔐 Get Google Drive OAuth Token
 * 
 * Helper script to get Google Drive refresh token for local testing
 * 
 * Usage:
 *   1. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in .env.local
 *   2. Run: node scripts/get-google-drive-token.js
 *   3. Open the URL in browser and authorize
 *   4. Copy the code from redirect URL
 *   5. Paste it when prompted
 * 
 * This will give you a refresh token that you can use in .env.local
 */

require('dotenv').config({ path: '.env.local' })
const readline = require('readline')
const http = require('http')

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Missing GOOGLE_DRIVE_CLIENT_ID or GOOGLE_DRIVE_CLIENT_SECRET')
  console.error('   Please set them in .env.local file')
  process.exit(1)
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve))
}

async function getToken() {
  try {
    console.log('🔐 Google Drive OAuth Token Helper\n')
    
    // Step 1: Generate authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    
    console.log('📋 Step 1: Open this URL in your browser:')
    console.log(`\n${authUrl.toString()}\n`)
    console.log('Step 2: Authorize the application')
    console.log('Step 3: Copy the "code" parameter from the redirect URL\n')
    
    // Step 2: Get authorization code
    const code = await question('Paste the authorization code here: ')
    
    if (!code) {
      console.error('❌ No code provided')
      process.exit(1)
    }
    
    // Step 3: Exchange code for tokens
    console.log('\n🔄 Exchanging code for tokens...')
    
    const tokenUrl = 'https://oauth2.googleapis.com/token'
    const tokenParams = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code.trim(),
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    })
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    })
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('❌ Failed to get tokens:', error)
      process.exit(1)
    }
    
    const tokens = await tokenResponse.json()
    
    console.log('\n✅ Tokens received!\n')
    console.log('📋 Add these to your .env.local file:\n')
    console.log(`GOOGLE_DRIVE_ACCESS_TOKEN=${tokens.access_token}`)
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`)
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      console.log(`GOOGLE_DRIVE_FOLDER_ID=${process.env.GOOGLE_DRIVE_FOLDER_ID}`)
    }
    console.log('\n💡 Note: Access token expires in 1 hour, but refresh token is permanent')
    console.log('   The system will automatically refresh the token when needed\n')
    
    rl.close()
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    rl.close()
    process.exit(1)
  }
}

getToken()


