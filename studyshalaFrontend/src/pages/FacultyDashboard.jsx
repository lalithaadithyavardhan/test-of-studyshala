import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import './FacultyDashboard.css';

const FacultyDashboard = () => {

  const { user } = useAuth();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState(null);

  const [formData, setFormData] = useState({
    department: '',
    semester: '',
    subjectName: '',
    facultyName: user?.name || ''
  });

  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);


  /* ========================================
     FETCH MATERIALS
  ======================================== */

  useEffect(() => {
    fetchMaterials();
  }, []);


  const fetchMaterials = async () => {

    try {

      setLoading(true);

      const res = await api.get('/faculty/folders');

      setMaterials(res.data.folders || []);

    } catch (err) {

      console.error(err);

      setError('Failed to load materials');

    } finally {

      setLoading(false);

    }

  };


  /* ========================================
     CREATE MATERIAL
  ======================================== */

  const handleCreateSubmit = async (e) => {

    e.preventDefault();

    try {

      await api.post('/faculty/folders', formData);

      setSuccess('Material created successfully');

      setShowCreateModal(false);

      setFormData({
        department: '',
        semester: '',
        subjectName: '',
        facultyName: user?.name || ''
      });

      fetchMaterials();

    } catch (err) {

      console.error(err);

      setError('Failed to create material');

    }

  };


  /* ========================================
     UPLOAD FILES
  ======================================== */

  const handleUploadSubmit = async () => {

    if (!selectedFolder || uploadFiles.length === 0) return;

    try {

      setUploading(true);

      const fd = new FormData();

      uploadFiles.forEach(file => {
        fd.append('files', file);
      });

      await api.post(
        `/faculty/folders/${selectedFolder._id}/files`,
        fd,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setSuccess('Files uploaded successfully');

      setShowUploadModal(false);

      setUploadFiles([]);

      fetchMaterials();

    } catch (err) {

      console.error(err);

      setError('Upload failed');

    } finally {

      setUploading(false);

    }

  };


  /* ========================================
     PREVIEW FILE  (FIXED)
  ======================================== */

  const openPreview = (file) => {

    if (!file.previewLink) {

      alert('Preview link not available');

      return;

    }

    window.open(file.previewLink, '_blank');

  };


  /* ========================================
     DOWNLOAD FILE  (FIXED)
  ======================================== */

  const downloadFile = (file) => {

    if (!file.downloadLink) {

      alert('Download link not available');

      return;

    }

    const link = document.createElement('a');

    link.href = file.downloadLink;

    link.target = '_blank';

    link.download = file.fileName || 'file';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };


  /* ========================================
     UI
  ======================================== */

  return (

    <div className="app-container">

      <Sidebar role="faculty" />

      <div className="main-content">

        <Navbar />

        <div className="page-container">

          <h1>Faculty Dashboard</h1>


          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}


          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}


          <Button onClick={() => setShowCreateModal(true)}>
            Create Material
          </Button>


          {loading ? (

            <p>Loading...</p>

          ) : (

            materials.map(folder => (

              <Card key={folder._id}>

                <h3>{folder.subjectName}</h3>

                <p>
                  {folder.department} • Semester {folder.semester}
                </p>


                <Button
                  onClick={() => {
                    setSelectedFolder(folder);
                    setShowUploadModal(true);
                  }}
                >
                  Upload Files
                </Button>


                {folder.files && folder.files.length > 0 ? (

                  <ul className="file-list">

                    {folder.files.map(file => (

                      <li
                        key={file.fileId}
                        className="file-item"
                      >

                        <span>
                          {file.fileName}
                        </span>


                        <div className="file-actions">


                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openPreview(file)}
                          >
                            Preview
                          </Button>


                          <Button
                            size="sm"
                            onClick={() => downloadFile(file)}
                          >
                            Download
                          </Button>


                        </div>

                      </li>

                    ))}

                  </ul>

                ) : (

                  <p>No files uploaded</p>

                )}

              </Card>

            ))

          )}

        </div>

      </div>



      {/* ========================================
          CREATE MATERIAL MODAL
      ======================================== */}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Material"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>

            <Button onClick={handleCreateSubmit}>
              Create
            </Button>
          </>
        }
      >

        <Input
          label="Faculty Name"
          value={formData.facultyName}
          onChange={(e) =>
            setFormData({
              ...formData,
              facultyName: e.target.value
            })
          }
        />


        <Input
          label="Department"
          value={formData.department}
          onChange={(e) =>
            setFormData({
              ...formData,
              department: e.target.value
            })
          }
        />


        <Input
          label="Semester"
          value={formData.semester}
          onChange={(e) =>
            setFormData({
              ...formData,
              semester: e.target.value
            })
          }
        />


        <Input
          label="Subject Name"
          value={formData.subjectName}
          onChange={(e) =>
            setFormData({
              ...formData,
              subjectName: e.target.value
            })
          }
        />


      </Modal>



      {/* ========================================
          UPLOAD MODAL
      ======================================== */}

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Files"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowUploadModal(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={handleUploadSubmit}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </>
        }
      >

        <input
          type="file"
          multiple
          onChange={(e) =>
            setUploadFiles(
              Array.from(e.target.files)
            )
          }
        />

      </Modal>


    </div>

  );

};


export default FacultyDashboard;
