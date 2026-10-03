import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Services.css";

function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      setServices(data || []);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Service name is required.");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("services")
        .update({
          name: name.trim(),
          description: description.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("services")
        .insert({
          name: name.trim(),
          description: description.trim(),
        });

      if (error) {
        alert(error.message);
        return;
      }
    }

    resetForm();
    loadServices();
  };

  const handleEdit = (service) => {
    setEditingId(service.id);
    setName(service.name);
    setDescription(service.description || "");
    setShowForm(true);
  };

  const handleToggleStatus = async (service) => {
    const newStatus =
      service.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("services")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", service.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadServices();
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this service?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadServices();
  };

  return (
    <div className="services-page">

      <div className="services-header">

        <div>
          <h1>Services</h1>

          <p>
            Manage the services offered by PHOENIX.
          </p>
        </div>

        <button
          className="add-service-btn"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Service
        </button>

      </div>

      {showForm && (
        <div className="service-form-card">

          <h2>
            {editingId ? "Edit Service" : "Add New Service"}
          </h2>

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label>Service Name</label>

              <input
                type="text"
                placeholder="Example: AI Development"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Description</label>

              <textarea
                placeholder="Describe this service..."
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
              />
            </div>

            <div className="form-actions">

              <button type="submit" className="save-btn">
                {editingId ? "Update Service" : "Add Service"}
              </button>

              <button
                type="button"
                className="cancel-btn"
                onClick={resetForm}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}

      <div className="services-card">

        <div className="services-card-header">
          <h2>All Services</h2>

          <span>
            {services.length} services
          </span>
        </div>

        {loading ? (
          <div className="empty-message">
            Loading services...
          </div>
        ) : services.length === 0 ? (
          <div className="empty-message">
            No services found.
          </div>
        ) : (
          <div className="services-table-wrapper">

            <table className="services-table">

              <thead>
                <tr>
                  <th>Service</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {services.map((service) => (
                  <tr key={service.id}>

                    <td>
                      <strong>
                        {service.name}
                      </strong>
                    </td>

                    <td>
                      {service.description || "—"}
                    </td>

                    <td>
                      <span
                        className={
                          service.status === "active"
                            ? "status active"
                            : "status inactive"
                        }
                      >
                        {service.status}
                      </span>
                    </td>

                    <td>
                      {new Date(
                        service.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td>

                      <div className="action-buttons">

                        <button
                          className="edit-btn"
                          onClick={() =>
                            handleEdit(service)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="toggle-btn"
                          onClick={() =>
                            handleToggleStatus(service)
                          }
                        >
                          {service.status === "active"
                            ? "Disable"
                            : "Enable"}
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(service.id)
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

      </div>

    </div>
  );
}

export default Services;