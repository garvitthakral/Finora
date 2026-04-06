import { useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

const CreateUser = () => {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await axios.post(
        import.meta.env.VITE_CREATE_USER_URL,
        {
          email,
          firstName,
          lastName,
          role,
        },
        {
          withCredentials: true,
          validateStatus: () => true,
        },
      );

      if (response.status > 201) {
        setLoading(false);
        console.error("User creation failed with status:", response.status, "and data:", response.data);
        return;
      }

      if (response.data.success) {
        localStorage.setItem("token", response.data.data.token);
        setToken(response.data.data.token);
        setLoading(false);
        navigate("/");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#1C1F2A" }}
    >
      <div
        className="w-[420px] p-8 rounded-xl"
        style={{ backgroundColor: "#16181F" }}
      >
        {/* Title */}
        <h1
          className="text-2xl font-bold text-center mb-6"
          style={{ color: "#6C63FF" }}
        >
          Create Your Profile
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* First Name */}
          <div>
            <label className="text-white text-sm">First Name</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md bg-[#1C1F2A] text-white border border-gray-700 focus:outline-none focus:border-[#6C63FF]"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="text-white text-sm">Last Name</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md bg-[#1C1F2A] text-white border border-gray-700 focus:outline-none focus:border-[#6C63FF]"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-white text-sm">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md bg-[#1C1F2A] text-white border border-gray-700 focus:outline-none focus:border-[#6C63FF]"
            >
              <option value="ADMIN">Admin</option>
              <option value="ANALYST">Analyst</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md font-semibold transition disabled:opacity-60"
            style={{
              backgroundColor: "#6C63FF",
              color: "white",
            }}
          >
            {loading ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateUser;
