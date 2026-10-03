import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./AdminFiles.css";

const BUCKET_NAME = "phoenix-files";

function AdminFiles() {
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      const [filesResult, projectsResult, tasksResult] =
        await Promise.all([
          supabase
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
                name
              ),
              tasks:task_id (
                title
              ),
              uploader:uploaded_by (
                name,
                email
              )
            `)
            .order("created_at", { ascending: false }),

          supabase
            .from("projects")
            .select("id, name")
            .order("name"),

          supabase
            .from("tasks")
            .select("id, title")
            .order("title"),
        ]);

      if (filesResult.error) {
        throw filesResult.error;
      }

      if (projectsResult.error) {
        throw projectsResult.error;
      }

      if (tasksResult.error) {
        throw tasksResult.error;
      }

      setFiles(filesResult.data || []);
      setProjects(projectsResult.data || []);
      setTasks(tasksResult.data || []);
    } catch (error) {
      console.error("Files loading error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const uploadFile = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert("Please select a file.");
      return;
    }

    if (!projectId) {
      alert("Please select a project.");
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const safeName = selectedFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const timestamp = Date.now();

      const filePath = `${projectId}/${timestamp}_${safeName}`;

      // Upload to Supabase Storage
      const { error: uploadError } =
        await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // Save file information in database
      const { error: databaseError } =
        await supabase
          .from("files")
          .insert({
            file_name: selectedFile.name,
            file_path: filePath,
            project_id: projectId,
            task_id: taskId || null,
            uploaded_by: user.id,
          });

      if (databaseError) {
        // Remove Storage file if database insert fails
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([filePath]);

        throw databaseError;
      }

      // Activity log
      await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          action: "upload_file",
          description:
            `Uploaded file: ${selectedFile.name}`,
        });

      alert("File uploaded successfully.");

      // Reset form
      setSelectedFile(null);
      setProjectId("");
      setTaskId("");

      // Reset file input
      const fileInput = document.getElementById(
        "admin-file-input"
      );

      if (fileInput) {
        fileInput.value = "";
      }

      await loadData();
    } catch (error) {
      console.error("Upload error:", error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (file) => {
    try {
      const { data, error } =
        await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(
            file.file_path,
            60 * 5
          );

      if (error) {
        throw error;
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error("Download error:", error);
      alert(error.message);
    }
  };

  const deleteFile = async (file) => {
    const confirmed = window.confirm(
      `Delete "${file.file_name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      // Delete from Storage
      const { error: storageError } =
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([file.file_path]);

      if (storageError) {
        throw storageError;
      }

      // Delete database record
      const { error: databaseError } =
        await supabase
          .from("files")
          .delete()
          .eq("id", file.id);

      if (databaseError) {
        throw databaseError;
      }

      // Activity log
      await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          action: "delete_file",
          description:
            `Deleted file: ${file.file_name}`,
        });

      alert("File deleted successfully.");

      await loadData();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.message);
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "Unknown";
    }

    return new Date(date).toLocaleString();
  };

  return (
    <div className="admin-files-page">

      {/* ================= HEADER ================= */}

      <header className="admin-files-header">

        <div>
          <span>PHOENIX ADMIN</span>

          <h1>Files</h1>

          <p>
            Manage company files and project documents.
          </p>
        </div>

        <button
          className="back-files-button"
          onClick={() => navigate("/admin")}
        >
          ← Dashboard
        </button>

      </header>


      {/* ================= UPLOAD ================= */}

      <section className="file-upload-card">

        <div>
          <h2>Upload File</h2>

          <p>
            Upload a document and connect it to a project
            or task.
          </p>
        </div>

        <form
          className="file-upload-form"
          onSubmit={uploadFile}
        >

          {/* Project */}

          <div className="file-form-group">

            <label>
              Project
            </label>

            <select
              value={projectId}
              onChange={(e) =>
                setProjectId(e.target.value)
              }
              required
            >

              <option value="">
                Select Project
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

          </div>


          {/* Task */}

          <div className="file-form-group">

            <label>
              Task
            </label>

            <select
              value={taskId}
              onChange={(e) =>
                setTaskId(e.target.value)
              }
            >

              <option value="">
                No Task
              </option>

              {tasks.map((task) => (
                <option
                  key={task.id}
                  value={task.id}
                >
                  {task.title}
                </option>
              ))}

            </select>

          </div>


          {/* File */}

          <div className="file-form-group file-input-group">

            <label>
              Select File
            </label>

            <input
              id="admin-file-input"
              type="file"
              onChange={handleFileChange}
            />

            {selectedFile && (
              <small>
                Selected: {selectedFile.name}
              </small>
            )}

          </div>


          {/* Upload button */}

          <button
            type="submit"
            className="upload-file-button"
            disabled={uploading}
          >
            {uploading
              ? "Uploading..."
              : "Upload File"}
          </button>

        </form>

      </section>


      {/* ================= FILE LIST ================= */}

      <section className="admin-files-section">

        <div className="files-section-title">

          <div>

            <h2>
              Uploaded Files
            </h2>

            <p>
              {files.length} file
              {files.length !== 1 ? "s" : ""}
            </p>

          </div>

        </div>


        {/* Loading */}

        {loading ? (

          <div className="files-empty">
            Loading files...
          </div>

        ) : files.length === 0 ? (

          /* Empty state */

          <div className="files-empty">

            <div className="file-empty-icon">
              📁
            </div>

            <h3>
              No Files Uploaded
            </h3>

            <p>
              Upload your first company file above.
            </p>

          </div>

        ) : (

          /* Files table */

          <div className="files-table-wrapper">

            <table className="files-table">

              <thead>

                <tr>

                  <th>
                    File
                  </th>

                  <th>
                    Project
                  </th>

                  <th>
                    Task
                  </th>

                  <th>
                    Uploaded By
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {files.map((file) => (

                  <tr key={file.id}>

                    {/* File */}

                    <td>

                      <div className="file-name-cell">

                        <div className="file-icon">
                          📄
                        </div>

                        <div>

                          <strong>
                            {file.file_name}
                          </strong>

                          <small>
                            {file.file_path}
                          </small>

                        </div>

                      </div>

                    </td>


                    {/* Project */}

                    <td>
                      {file.projects?.name ||
                        "No project"}
                    </td>


                    {/* Task */}

                    <td>
                      {file.tasks?.title ||
                        "No task"}
                    </td>


                    {/* Uploaded by */}

                    <td>
                      {file.uploader?.name ||
                        "Unknown"}
                    </td>


                    {/* Date */}

                    <td>
                      {formatDate(
                        file.created_at
                      )}
                    </td>


                    {/* Actions */}

                    <td>

                      <div className="file-actions">

                        <button
                          className="download-file-button"
                          onClick={() =>
                            downloadFile(file)
                          }
                        >
                          Download
                        </button>

                        <button
                          className="delete-file-button"
                          onClick={() =>
                            deleteFile(file)
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}

export default AdminFiles;