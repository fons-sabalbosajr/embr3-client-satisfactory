import React from "react";
import "./homeadmin.css";

function AdminHome() {
  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Setup and manage configurations before enabling client access.</p>
      </header>

      <section className="admin-section">
        <h2>System Setup</h2>
        <button className="admin-button">Create User Accounts</button>
        <button className="admin-button">Extract Result Data</button>
        <button className="admin-button">Configure Dashboard</button>
        <button className="admin-button">System Parameters</button>
      </section>
    </div>
  );
}

export default AdminHome;
