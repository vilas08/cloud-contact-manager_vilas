import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

async function api(path, method = "GET", data) {
  const res = await fetch(API + path, {
    method,
    ...(data
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }
      : {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json;
}

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api("/contacts");
      setContacts(data.contacts);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      const body = { name, email };
      if (editId) await api("/contacts/" + editId, "PUT", body);
      else await api("/contacts", "POST", body);
      setName("");
      setEmail("");
      setEditId(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    try {
      await api("/contacts/" + id, "DELETE");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "30px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <h1>Contact Manager</h1>

      <form onSubmit={save} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input style={{ flex: 1, padding: 8 }} placeholder="Name" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <input style={{ flex: 1, padding: 8 }} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit">{editId ? "Update" : "Add"}</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr><th align="left">Name</th><th align="left">Email</th><th></th></tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>
                <button onClick={() => { setEditId(c.id); setName(c.name); setEmail(c.email); }}>
                  Edit
                </button>{" "}
                <button onClick={() => remove(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}