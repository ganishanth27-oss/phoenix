import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./ManagerFiles.css";

const BUCKET_NAME = "phoenix-files";

function ManagerFiles() {
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [manager, setManager] = useState(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, name, email, role, status")
          .eq("id", user.id)
          .single();

      if (profileError) throw profileError;

      setManager(profile);

      /* ================================
         MANAGER PROJECTS
      ================================= */

      const { data: projectData, error: projectError } =
        await supabase
          .from("projects")
          .select(`
            id,
            name,
            status
          `)
          .eq("manager_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (projectError) throw projectError;

      setProjects(projectData || []);

      /* ================================
         MANAGER FILES
      ================================= */

      const { data: fileData, error: fileError } =
        await supabase
          .from("files")
          .select(`
            id,
            file_name,
            file_path,
            project_id,
            task_id,
            uploaded_by,
            created_at,
            projects:project_id (
              id,
              name
            )
          `)
          .order("created_at", {
            ascending: false,
          });

      if (fileError) throw fileError;

      const managerProjectIds =
        (projectData || []).map(
          (project) => project.id
        );

      const accessibleFiles =
        (fileData || []).filter((file) =>
          managerProjectIds.includes(file.project_id)
        );

      setFiles(accessibleFiles);
    } catch (error) {
      console.error("Manager files error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ================================
     UPLOAD FILE
  ================================= */

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!selectedProject) {
      alert("Please select a project first.");
      event.target.value = "";
      return;
    }

    if (!manager) {
      alert("Manager information is not available.");
      return;
    }

    setUploading(true);

    try {
      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const filePath = `${selectedProject}/${Date.now()}_${safeName}`;

      /* ================================
         STORAGE UPLOAD
      ================================= */

      const { error: uploadError } =
        await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      /* ================================
         DATABASE RECORD
      ================================= */

      const { error: databaseError } =
        await supabase
          .from("files")
          .insert({
            file_name: file.name,
            file_path: filePath,
            project_id: selectedProject,
            uploaded_by: manager.id,
          });

      if (databaseError) {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([filePath]);

        throw databaseError;
      }

      await supabase.from("activity_logs").insert({
        user_id: manager.id,
        action: "manager_uploaded_file",
        description: `Manager uploaded file "${file.name}"`,
      });

      alert("File uploaded successfully.");

      event.target.value = "";
      setSelectedProject("");

      await loadData();
    } catch (error) {
      console.error("File upload error:", error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  /* ================================
     DOWNLOAD FILE
  ================================= */

  const handleDownload = async (file) => {
    try {
      const { data, error } =
        await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(
            file.file_path,
            60 * 10
          );

      if (error) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Download error:", error);
      alert(error.message);
    }
  };

  /* ================================
     DATE
  ================================= */

  const formatDate = (date) => {
    if (!date) return "Unknown";

    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="manager-files-loading">
        Loading project files...
      </div>
    );
  }

  return (
    <div className="manager-files-page">

      {/* HEADER */}

      <header className="manager-files-header">

        <div>
          <span className="manager-files-label">
            PHOENIX MANAGER
          </span>

          <h1>
            Project Files
          </h1>

          <p>
            Upload and access files for your
            assigned projects.
          </p>
        </div>

        <div className="manager-files-actions">

          <button
            className="manager-files-back"
            onClick={() => navigate("/manager")}
          >
            ← Dashboard
          </button>

          <button
            className="manager-files-refresh"
            onClick={loadData}
          >
            ↻ Refresh
          </button>

        </div>

      </header>


      {/* SUMMARY */}

      <section className="manager-files-summary">

        <div className="manager-files-summary-card">
          <span>Projects</span>
          <strong>{projects.length}</strong>
        </div>

        <div className="manager-files-summary-card">
          <span>Files</span>
          <strong>{files.length}</strong>
        </div>

      </section>


      {/* UPLOAD */}

      <section className="manager-files-upload-card">

        <div>
          <span className="manager-files-small-label">
            UPLOAD FILE
          </span>

          <h2>
            Add a project file
          </h2>

          <p>
            Select one of your assigned projects
            and upload a file.
          </p>
        </div>

        <div className="manager-files-upload-controls">

          <select
            value={selectedProject}
            onChange={(event) =>
              setSelectedProject(event.target.value)
            }
          >
            <option value="">
              Select project
            </option>

            {projects.map((project) => (
              <option
                key={project.id}
                value={project.id}
              >
                {project.name}
              </option>
            ))}
          </select>

          <label className="manager-upload-button">

            {uploading
              ? "Uploading..."
              : "Choose File"}

            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              hidden
            />

          </label>

        </div>

      </section>


      {/* FILE LIST */}

      <section className="manager-files-container">

        <div className="manager-files-container-header">

          <div>
            <h2>
              Project Files
            </h2>

            <p>
              Files available for your assigned
              projects.
            </p>
          </div>

        </div>

        {files.length === 0 ? (

          <div className="manager-files-empty">

            <div className="manager-files-empty-icon">
              📎
            </div>

            <h3>
              No files yet
            </h3>

            <p>
              Upload a file using the upload
              section above.
            </p>

          </div>

        ) : (

          <div className="manager-files-list">

            {files.map((file) => (

              <div
                className="manager-file-item"
                key={file.id}
              >

                <div className="manager-file-icon">
                  📄
                </div>

                <div className="manager-file-details">

                  <strong>
                    {file.file_name}
                  </strong>

                  <span>
                    Project:{" "}
                    {file.projects?.name ||
                      "Unknown project"}
                  </span>

                  <small>
                    Uploaded{" "}
                    {formatDate(file.created_at)}
                  </small>

                </div>

                <button
                  className="manager-file-download"
                  onClick={() =>
                    handleDownload(file)
                  }
                >
                  Open
                </button>

              </div>

            ))}

          </div>

        )}

      </section>

    </div>
  );
}

export default ManagerFiles;