import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

import {
  MdStar,
  MdStarBorder,
  MdFolderOpen,
  MdInsertDriveFile,
  MdPictureAsPdf,
  MdImage,
  MdVideoFile,
  MdDescription,
  MdSearch,
  MdClose,
  MdOpenInNew,
  MdDownload
} from 'react-icons/md';

import { ImSpinner8 } from 'react-icons/im';
import './StudentStarred.css';



/* ───────────────── File Icon ───────────────── */

const FileIcon = ({ mimeType }) => {

  if (!mimeType) return <MdInsertDriveFile className="ss-file-icon" />

  if (mimeType.includes('pdf'))
    return <MdPictureAsPdf className="ss-file-icon ss-icon--pdf" />

  if (mimeType.includes('image'))
    return <MdImage className="ss-file-icon ss-icon--img" />

  if (mimeType.includes('video'))
    return <MdVideoFile className="ss-file-icon ss-icon--vid" />

  if (mimeType.includes('word') || mimeType.includes('document'))
    return <MdDescription className="ss-file-icon ss-icon--doc" />

  return <MdInsertDriveFile className="ss-file-icon" />

}



/* ───────────────── Format Date ───────────────── */

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '—';



/* ───────────────── File Preview Modal ───────────────── */

const FilePreview = ({ file, onClose }) => {

  useEffect(() => {

    const h = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }

  }, [onClose])



  const driveId = file.driveFileId

  const previewUrl = driveId
    ? `https://drive.google.com/file/d/${driveId}/preview`
    : null

  const downloadUrl = driveId
    ? `https://drive.usercontent.google.com/download?id=${driveId}&export=download`
    : null



  return (

    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >

      <div
        style={{
          width: '90%',
          maxWidth: '900px',
          height: '88vh',
          background: '#fff',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >

        {/* Header */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px',
            background: '#0891b2',
            color: '#fff'
          }}
        >

          <span style={{ flex: 1 }}>{file.fileName}</span>

          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#fff' }}
            >
              <MdDownload /> Download
            </a>
          )}

          <button onClick={onClose}>✕</button>

        </div>



        {/* Body */}

        <div style={{ flex: 1 }}>

          {!driveId ? (

            <div style={{ textAlign: 'center', padding: '40px' }}>
              Preview not available
            </div>

          ) : file.mimeType?.startsWith('image/') ? (

            <img
              src={`https://drive.google.com/thumbnail?id=${driveId}&sz=w2000`}
              alt={file.fileName}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />

          ) : (

            <iframe
              src={previewUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={file.fileName}
            />

          )}

        </div>

      </div>

    </div>

  )

}



/* ───────────────── Scroll Reveal ───────────────── */

const Reveal = ({ children, delay = 0 }) => {

  const ref = useRef(null)

  useEffect(() => {

    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('ss-visible')
          obs.unobserve(el)
        }
      },
      { threshold: 0.06 }
    )

    obs.observe(el)

    return () => obs.disconnect()

  }, [])

  return (
    <div ref={ref} className="ss-reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )

}



/* ───────────────── Main Component ───────────────── */

const StudentStarred = () => {

  const navigate = useNavigate()

  const [starred, setStarred] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [previewFile, setPreviewFile] = useState(null)



  useEffect(() => {
    fetchStarred()
  }, [])



  const fetchStarred = async () => {

    try {

      setLoading(true)

      const res = await api.get('/student/starred-files')

      setStarred(res.data.starredFiles || [])

    } catch (err) {

      console.error(err)

    } finally {

      setLoading(false)

    }

  }



  const handleUnstar = async (fileId) => {

    setStarred(prev => prev.filter(s => s.fileId !== fileId))

    try {

      await api.delete(`/student/starred-files/${fileId}`)

    } catch {

      fetchStarred()

    }

  }



  const handleOpenFile = (sf) => {

    setPreviewFile({
      fileName: sf.fileName,
      mimeType: sf.mimeType,
      driveFileId: sf.fileId
    })

  }



  const filtered = starred.filter(s => {

    const q = search.toLowerCase()

    return (
      !q ||
      s.fileName?.toLowerCase().includes(q) ||
      s.subjectName?.toLowerCase().includes(q)
    )

  })



  return (

    <div className="app-container">

      <Sidebar role="student" />

      <div className="main-content">

        <Navbar />

        <div className="ss-page">

          <h1>Your Starred Files</h1>



          {/* Search */}

          <div className="ss-search-wrap">

            <MdSearch />

            <input
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button onClick={() => setSearch('')}>
                <MdClose />
              </button>
            )}

          </div>



          {/* Loading */}

          {loading ? (

            <div className="ss-loading">
              <ImSpinner8 className="ss-spinner" />
              Loading...
            </div>

          ) : (

            <div className="ss-groups">

              {filtered.map((sf, i) => (

                <Reveal key={sf.fileId} delay={i * 40}>

                  <div
                    className="ss-file-row"
                    onClick={() => handleOpenFile(sf)}
                  >

                    <FileIcon mimeType={sf.mimeType} />

                    <div className="ss-file-info">

                      <div className="ss-file-name">{sf.fileName}</div>

                      <div className="ss-file-meta">
                        {sf.subjectName} • {fmtDate(sf.starredAt)}
                      </div>

                    </div>



                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenFile(sf)
                      }}
                    >
                      <MdOpenInNew />
                    </button>



                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnstar(sf.fileId)
                      }}
                    >
                      <MdStar />
                    </button>

                  </div>

                </Reveal>

              ))}

            </div>

          )}

        </div>

      </div>



      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

    </div>

  )

}



export default StudentStarred
