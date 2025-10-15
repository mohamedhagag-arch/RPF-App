# 📱 QR Code System Guide

## Overview
Comprehensive QR Code system for Al Rabat Foundation that generates vCard QR codes for all users with company logo integration.

---

## 🎯 Features

### ✨ Core Features
- **Automatic QR Code Generation**: For all current and future users
- **vCard Format**: Complete contact information in standard format
- **Company Logo Integration**: Uses logo from system settings/database
- **Dynamic Updates**: Automatically reflects company branding changes
- **Smooth Design**: Rounded corners and soft styling
- **Dark Mode Support**: Works seamlessly in both light and dark themes

### 📋 vCard Information
- First Name & Last Name
- Email Address
- Primary & Secondary Phone Numbers
- Company Name (from settings)
- Department Name
- Job Title
- About/Bio
- Profile Picture URL

---

## 🎨 Design Features

### QR Code Styling
- **Color**: Pure black (#000000) for maximum readability
- **Error Correction**: Level L (lower details for cleaner look)
- **Logo**: Company logo from database in center
- **Fallback**: "AR" logo if company logo not available
- **Rounded Corners**: `rounded-2xl` for soft appearance
- **Margin**: 4 units for proper spacing

### Visual Design
- **Card**: `rounded-3xl` with soft shadows
- **Logo Circle**: 16×16px with gradient or company image
- **Company Name**: Gradient text effect
- **Buttons**: Rounded-full with smooth transitions
- **Colors**: Blue to purple gradients

---

## 🏗️ Architecture

### Component Structure
```
components/qr/
  └── QRCodeGenerator.tsx       # Main QR code component
  
app/(authenticated)/
  ├── profile/[userId]/page.tsx  # Individual profile with QR
  ├── qr/[userId]/page.tsx       # Dedicated QR page
  └── directory/page.tsx         # Directory with QR access
  
components/
  ├── settings/ProfileManager.tsx # Profile settings with QR
  └── users/UserCard.tsx          # User cards with QR link
```

### Database Integration
```sql
-- System Settings Table
system_settings
  ├── company_logo: text       -- URL to company logo
  ├── company_name: text       -- Company name
  └── ...other settings
```

---

## 🔧 Technical Implementation

### QR Code Generation Process

1. **Load Company Settings**
   ```typescript
   const loadCompanySettings = async () => {
     const { data: settings } = await supabase
       .from('system_settings')
       .select('company_logo, company_name')
       .single()
     
     if (settings) {
       setCompanyLogo(settings.company_logo)
       setCompanyName(settings.company_name)
     }
   }
   ```

2. **Generate vCard Data**
   ```typescript
   const vcard = [
     'BEGIN:VCARD',
     'VERSION:3.0',
     `FN:${first_name} ${last_name}`,
     `ORG:${companyName}`,         // From database
     `EMAIL:${email}`,
     `TEL:${phone_1}`,
     // ... more fields
     'END:VCARD'
   ].join('\n')
   ```

3. **Create QR Code**
   ```typescript
   const options = {
     width: size,
     margin: 4,
     color: { dark: '#000000', light: '#ffffff' },
     errorCorrectionLevel: 'L'  // Less details
   }
   
   const qrDataURL = await QRCode.toDataURL(vcardData, options)
   ```

4. **Add Company Logo**
   ```typescript
   // Draw QR code on canvas
   ctx.drawImage(img, 0, 0, size, size)
   
   // Draw white rounded background
   ctx.roundRect(logoX - 6, logoY - 6, logoSize + 12, logoSize + 12, radius)
   
   // Draw company logo or fallback AR logo
   if (companyLogo) {
     ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
   } else {
     drawDefaultLogo(ctx, logoX, logoY, logoSize)
   }
   ```

### Default AR Logo
```typescript
const drawDefaultLogo = (ctx, logoX, logoY, logoSize) => {
  // Gradient circle
  const gradient = ctx.createLinearGradient(...)
  gradient.addColorStop(0, '#3b82f6')
  gradient.addColorStop(1, '#8b5cf6')
  
  ctx.beginPath()
  ctx.arc(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 0, 2 * Math.PI)
  ctx.fill()
  
  // "AR" text
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${logoSize * 0.45}px Arial`
  ctx.fillText('AR', logoX + logoSize/2, logoY + logoSize/2)
}
```

---

## 📱 Component Usage

### QRCodeGenerator Props
```typescript
interface QRCodeGeneratorProps {
  userData: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone_1?: string
    phone_2?: string
    department_name_en?: string
    job_title_en?: string
    about?: string
    profile_picture_url?: string
  }
  size?: number              // Default: 200
  showControls?: boolean     // Default: true
  showVCardInfo?: boolean    // Default: true
}
```

### Example Usage
```tsx
<QRCodeGenerator
  userData={{
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone_1: user.phone_1,
    phone_2: user.phone_2,
    department_name_en: user.department_name_en,
    job_title_en: user.job_title_en,
    about: user.about,
    profile_picture_url: user.profile_picture_url
  }}
  size={200}
  showControls={true}
  showVCardInfo={true}
/>
```

---

## 🎯 Integration Points

### 1. Profile Settings
**Location**: `components/settings/ProfileManager.tsx`
- Full QR code with vCard information
- Size: 200px
- Shows all controls and information

### 2. Individual Profile Page
**Location**: `app/(authenticated)/profile/[userId]/page.tsx`
- Compact QR code in left column
- Size: 150px
- Controls visible, vCard info hidden

### 3. Dedicated QR Page
**Location**: `app/(authenticated)/qr/[userId]/page.tsx`
- Large QR code display
- Size: 350px
- Complete contact information
- Usage instructions
- Shareable and downloadable

### 4. User Directory
**Location**: `components/users/UserCard.tsx`
- Link to dedicated QR page
- Accessible from dropdown menu
- Opens in new page

---

## 🎨 Styling Guide

### Colors
```css
/* QR Code */
--qr-dark: #000000         /* Pure black */
--qr-light: #ffffff        /* Pure white */

/* Logo Gradient */
--logo-start: #3b82f6      /* Blue-500 */
--logo-end: #8b5cf6        /* Purple-500 */

/* Card Background */
--card-bg: white / gray-800
--card-shadow: shadow-2xl
```

### Border Radius
```css
/* QR Card */
border-radius: 1.5rem;     /* rounded-3xl */

/* QR Image */
border-radius: 1rem;       /* rounded-2xl */

/* Buttons */
border-radius: 9999px;     /* rounded-full */

/* Logo */
border-radius: 50%;        /* rounded-full */
```

---

## 🚀 Features

### Download QR Code
- Downloads as PNG file
- Filename: `FirstName_LastName_QRCode.png`
- High quality export

### Copy to Clipboard
- Copies QR code image
- Copies vCard text
- Success feedback messages

### Share QR Code
- Uses Web Share API when available
- Fallback to download
- Share with contact info

---

## 🔄 Update Mechanism

### Automatic Updates
1. Company logo/name changed in settings
2. Component re-fetches on mount
3. QR code regenerates with new branding
4. All existing QR codes reflect changes on next view

### Manual Refresh
- Component re-generates on:
  - User data change
  - Size change
  - Company logo/name change

---

## 📊 Use Cases

### For Users
1. **Download QR Code**: Save to phone/computer
2. **Print QR Code**: Add to business cards/badges
3. **Share Contact**: Quick contact sharing
4. **Email Signature**: Add to email

### For Admins
1. **Bulk Generation**: All users have QR codes
2. **Branding Update**: Change logo once, affects all
3. **Contact Management**: Easy contact distribution
4. **Event Management**: Quick attendee info sharing

---

## 🎯 Scanning Instructions

### For Recipients
1. Open phone camera or QR scanner app
2. Point camera at the QR code
3. Tap notification to add contact
4. Contact saved with all information

### Compatibility
- ✅ iOS Camera & Contacts
- ✅ Android Camera & Contacts
- ✅ Google Contacts
- ✅ Microsoft Outlook
- ✅ All vCard-compatible apps

---

## 🔧 Configuration

### Update Company Logo
```sql
UPDATE system_settings
SET company_logo = 'https://your-logo-url.com/logo.png'
WHERE id = 1;
```

### Update Company Name
```sql
UPDATE system_settings
SET company_name = 'Your Company Name'
WHERE id = 1;
```

### Adjust QR Code Size
```tsx
// Small
<QRCodeGenerator size={150} />

// Medium (Default)
<QRCodeGenerator size={200} />

// Large
<QRCodeGenerator size={350} />
```

---

## 🎨 Customization Options

### Logo Size
Current: 22% of QR code size
```typescript
const logoSize = size * 0.22  // Adjust percentage
```

### Error Correction Level
Current: L (7% recovery)
Options: L, M (15%), Q (25%), H (30%)
```typescript
errorCorrectionLevel: 'L'  // Change as needed
```

### Margin
Current: 4 units
```typescript
margin: 4  // Adjust for more/less spacing
```

---

## 🐛 Troubleshooting

### Logo Not Displaying
1. Check `system_settings` table has valid logo URL
2. Ensure logo URL is accessible (CORS)
3. Check browser console for errors
4. Fallback to AR logo if image fails

### QR Code Not Scanning
1. Increase error correction level (L → M)
2. Reduce logo size (22% → 18%)
3. Ensure good contrast (black on white)
4. Test with different scanner apps

### Performance Issues
1. Reduce size for faster generation
2. Cache company settings
3. Debounce regeneration
4. Use loading states

---

## 📚 Dependencies

```json
{
  "qrcode": "^1.5.3",
  "@types/qrcode": "^1.5.0"
}
```

---

## 🎉 Summary

The QR Code system provides:
- ✅ Automatic QR generation for all users
- ✅ Company logo integration from database
- ✅ Dynamic branding updates
- ✅ Complete vCard information
- ✅ Smooth, professional design
- ✅ Multiple integration points
- ✅ Download, copy, and share features
- ✅ Mobile-optimized scanning
- ✅ Dark mode support
- ✅ Future-proof architecture

**All QR codes automatically update when company branding changes!** 🎯✨

