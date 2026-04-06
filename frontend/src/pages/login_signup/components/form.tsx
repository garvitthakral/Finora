import axios from "axios";
import React, { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";

type FormProps = {
  isLogin: boolean;
};

const Form: React.FC<FormProps> = ({ isLogin }) => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log({ email });

    const reqBody = {
      email,
    };

    const response = await axios.post(import.meta.env.VITE_SIGNUP_URL, reqBody);

    if (response.data.success === true) {
      setLoading(false);
      navigate("/otp", {
        state: { isLogin: isLogin, email },
      });
    } else {
      setLoading(false);
      alert("Failed to send OTP. Please try again.");
    }
  };
  return (
    <div>
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "#1C1F2A" }}
      >
        <div
          className="w-full max-w-md p-8 rounded-xl shadow-lg"
          style={{ backgroundColor: "#16181F" }}
        >
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold" style={{ color: "#6C63FF" }}>
              Finora
            </h1>
            <p className="text-gray-300 mt-2">
              {isLogin ? "Login to your dashboard" : "Sign up for your account"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-white text-sm block mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 rounded-md bg-[#1C1F2A] text-white border border-gray-700 focus:outline-none focus:border-[#6C63FF]"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Button */}
            {loading ? (
              <div
                className="w-full py-2 rounded-md font-semibold text-center"
                style={{
                  backgroundColor: "#6C63FF",
                  color: "white",
                }}
              >
                Sending OTP...
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="w-full py-2 rounded-md font-semibold transition"
                    style={{
                      backgroundColor: "#6C63FF",
                      color: "white",
                    }}
                  >
                    {isLogin ? "Log In" : "Sign Up"}
                  </button>
                </div>

                <NavLink
                  to={isLogin ? "/signup" : "/login"}
                  className="text-sm text-gray-400 hover:text-gray-300 transition"
                >
                  {isLogin
                    ? "Don't have an account? Sign Up"
                    : "Already have an account? Log In"}
                </NavLink>
              </>
            )}
          </form>

          {/* Footer */}
          <p className="text-center text-gray-400 text-sm mt-6">
            © {new Date().getFullYear()} Finora
          </p>
        </div>
      </div>
    </div>
  );
};

export default Form;
