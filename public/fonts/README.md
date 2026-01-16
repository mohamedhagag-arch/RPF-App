# Font Files Directory

## Option 1: Local Font Files

Place your Jeko font files here with the following naming convention:

- `Jeko-Regular.ttf` - Regular weight font
- `Jeko-Bold.ttf` - Bold weight font
- `Jeko-Italic.ttf` - Italic style font
- `Jeko-BoldItalic.ttf` - Bold Italic style font

## Option 2: Google Drive Font Files

You can also load fonts from Google Drive by setting environment variables in your `.env.local` file:

```env
NEXT_PUBLIC_JEKO_REGULAR_URL=https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing
NEXT_PUBLIC_JEKO_BOLD_URL=https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing
NEXT_PUBLIC_JEKO_ITALIC_URL=https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing
NEXT_PUBLIC_JEKO_BOLD_ITALIC_URL=https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing
```

### How to Get Google Drive File URLs:

1. Upload your font files to Google Drive
2. Right-click on each file and select "Get link" or "Share"
3. Make sure the file is set to "Anyone with the link can view"
4. Copy the shareable link
5. Paste it into the corresponding environment variable

The system will automatically:
- Extract the file ID from the Google Drive URL
- Convert it to a direct download link
- Load and embed the font in PDF reports

## Notes

- All font files must be in TTF format
- The font files will be embedded in the PDF reports
- If any font file is missing, the system will fall back to Helvetica/Roboto
- Priority: Environment variables (Google Drive) > Local files (`/fonts/` directory)
- Google Drive files must be publicly accessible (set to "Anyone with the link can view")
