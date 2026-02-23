# CSMS v6 — Complete Architecture Documentation

## Page Structure

### Student Pages (4 separate pages)

1. **Enter Code Page** (`/student/enter-code`)
   - Student enters 8-character access code
   - Validates code with backend
   - Redirects to Material Access page on success

2. **Material Access Page** (`/student/material-access/:id`)
   - Shows material details (subject, faculty, dept, semester)
   - **Two clear options:**
     - **💾 Save Material** → Saves to "My Materials" (persistent bookmark)
     - **⬇️ Download Files** → Download files immediately (one-time access)
   - These actions are **separate** — student can do both or just one

3. **My Materials Page** (`/student/saved-materials`)
   - Shows all materials student has saved
   - **No code required** to access saved materials
   - Each material has:
     - Preview (browse files)
     - Download files
     - Remove from saved list
   - This is **persistent** and personal to the student

4. **History Page** (`/student/history`)
   - Shows all materials accessed via codes (access log)
   - Each entry shows:
     - Material name, faculty, department, semester
     - Access code used
     - Date accessed
     - **Save button** (if not already saved)
     - **Open button** → goes to Material Access page
   - Materials remain here even if deleted by faculty (historical record)

### Faculty Pages (2 separate pages)

1. **Dashboard** (`/faculty/dashboard`)
   - Create new materials (with faculty name input)
   - Upload files (drag-and-drop, multiple files)
   - Shows quick overview of materials

2. **Faculty Materials Page** (`/faculty/materials`)
   - **Completely separate** from student pages
   - View all uploaded materials
   - Each material shows:
     - Subject name, faculty name, dept, semester
     - Access code (with copy button)
     - File count
     - Student access count (views)
   - **Preview files** (opens modal with file list)
   - **Download own files**
   - **Delete material** with confirmation
     - Removes from Google Drive
     - Removes from ALL students' saved materials
     - Removes from ALL students' access history
     - Invalidates access code immediately

---

## User Flows

### Student Flow — First Time Access

```
1. Login → Redirected to /student/enter-code
2. Enter code (e.g., A3F9K2BX)
3. Code validated → Redirected to /student/material-access/:id
4. Student sees TWO options:
   
   Option A: Save Material
   - Click "💾 Save Material"
   - Material added to "My Materials"
   - Can access without code forever
   
   Option B: Download Files
   - See list of all files
   - Click "⬇️ Download" on any file
   - File downloads to computer
   - Material NOT saved (unless they also click Save)

5. Material is added to History regardless of Save/Download
```

### Student Flow — Returning User

```
1. Login → /student/enter-code
2. Click "📚 My Saved Materials"
3. See all previously saved materials
4. Click "📂 Browse Files" → Download any file
5. No code required ever again
```

### Student Flow — Check History

```
1. Go to History page
2. See all materials accessed (with codes + dates)
3. Materials marked "✓ Saved" if already in My Materials
4. Can click "💾 Save" to add to My Materials
5. Can click "📂 Open" to go to Material Access page
```

### Faculty Flow — Create & Upload

```
1. Login → /faculty/dashboard
2. Click "➕ Create Material"
3. Fill form:
   - Faculty Name (manual entry, not auto-pulled)
   - Department
   - Semester
   - Subject Name
   - Permission level
4. Material created with auto-generated code
5. Click "📤 Upload" on material card
6. Drag & drop multiple files OR click to browse
7. Files uploaded to Google Drive silently
8. Share code with students
```

### Faculty Flow — Manage Materials

```
1. Go to /faculty/materials
2. See all uploaded materials
3. Click "📂 Preview" → See all files
4. Click "⬇️ Download" → Download own files
5. Click "Delete" → Confirmation dialog appears:
   "Delete this material? All files will be removed from 
   Google Drive and all students will lose access."
6. Confirm → Material deleted:
   - Files removed from Google Drive
   - Removed from all students' My Materials
   - Removed from all students' History
   - Code becomes invalid
```

---

## Database Schema

### User Model
```js
{
  googleId: String,
  name: String,
  email: String,
  role: 'student' | 'faculty' | 'admin',
  
  // Student-specific
  savedMaterials: [
    { materialId: ObjectId, savedAt: Date }
  ],
  accessHistory: [
    { materialId: ObjectId, accessCode: String, accessedAt: Date }
  ]
}
```

### Folder Model
```js
{
  facultyId: ObjectId,
  facultyName: String,  // manually entered
  subjectName: String,
  department: String,
  semester: String,
  accessCode: String,   // auto-generated (e.g., A3F9K2BX)
  files: [
    {
      name: String,
      mimeType: String,
      size: Number,
      driveFileId: String,
      uploadedAt: Date
    }
  ],
  accessCount: Number,  // tracks student views
  active: Boolean
}
```

---

## API Endpoints

### Student Endpoints
```
POST   /student/validate-code        # Validate access code
POST   /student/save-material        # Save to My Materials
GET    /student/saved-materials      # Get saved materials
DELETE /student/saved-materials/:id  # Remove from saved
GET    /student/access-history       # Get access history
GET    /student/materials/:id/files  # Get files in material
GET    /student/materials/:id/files/:fileId/download  # Download file
```

### Faculty Endpoints
```
GET    /faculty/folders              # Get all materials
POST   /faculty/folders              # Create material
GET    /faculty/folders/:id          # Get material details
DELETE /faculty/folders/:id          # Delete material (removes from all students)
POST   /faculty/folders/:id/files    # Upload files (multiple)
DELETE /faculty/folders/:id/files/:fileId  # Delete single file
```

---

## Key Features

### ✅ Save vs Download — Clearly Separated
- **Save** → Persistent bookmark in My Materials
- **Download** → One-time file download
- Both options shown on Material Access page
- Student can choose one or both

### ✅ No Re-Entry of Codes
- Once saved, material accessible forever from My Materials
- No code required for saved materials

### ✅ Complete Access History
- Every code entry is logged
- History persists even if faculty deletes material
- Students can see what they accessed and when

### ✅ Faculty Full Control
- Preview all uploaded files
- Download own files
- Delete removes from everywhere (Drive + all students)
- View student access count

### ✅ Proper Deletion
- Files removed from Google Drive
- Material removed from all students' savedMaterials
- Material removed from all students' accessHistory
- Code becomes invalid immediately
- Confirmation dialog prevents accidents

---

## Page Separation Summary

### Student Pages — Completely Separate
1. Enter Code
2. Material Access (Save or Download)
3. My Materials
4. History

### Faculty Pages — Completely Separate
1. Dashboard (Create + Upload)
2. My Materials (Preview + Download + Delete)

**No mixing between roles.**
**No confusion about where to find features.**
**Clean, scalable architecture.**
