import axios from "axios";
import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

const Otp: React.FC = () => {
  const { setToken } = useAuth();
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.state?.isLogin;
  const email = location.state?.email;
  const [loading, setLoading] = useState(false);

  const handleChange = (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const finalOtp = otp.join("");
    console.log("OTP:", finalOtp, "Login:", isLogin);

    const reqBody = {
      email: email,
      otp: finalOtp,
      isLogin: isLogin,
    };

    const response = await axios.post(
      import.meta.env.VITE_VERIFY_OTP_URL,
      reqBody, {
        withCredentials: true,
        validateStatus: () => true,
      }
    );

    if(response.status !== 200){
        setLoading(false);
        console.error("OTP verification failed with status:", response.status, "and data:", response.data);
        alert("OTP verification failed. Please try again.");
        navigate("/login"); 
        return
    }

    console.log("Response:", response.data);

    if (response.data.success === true) {
      if (isLogin) {
        setLoading(false);
        localStorage.setItem("token", response.data.data.token);
        setToken(response.data.data.token);
        navigate("/");
      } else {
        setLoading(false);
        navigate("/create-user", { state: { email } });
      }
    } else {
      setLoading(false);
      alert("OTP verification failed. Please try again.");
      navigate("/signin");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#1C1F2A" }}
    >
      <div
        className="p-8 rounded-xl w-[420px]"
        style={{ backgroundColor: "#16181F" }}
      >
        {/* Title */}
        <h1
          className="text-2xl font-bold text-center mb-2"
          style={{ color: "#6C63FF" }}
        >
          Verify OTP
        </h1>

        <p className="text-gray-300 text-center mb-8">
          Enter the 6 digit code sent to your email
        </p>

        {/* OTP Inputs */}
        <div className="flex justify-between mb-8">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputs.current[index] = el;
              }}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              maxLength={1}
              className="w-12 h-12 text-center text-xl rounded-md text-white border border-gray-700 bg-[#1C1F2A] focus:outline-none focus:border-[#6C63FF]"
            />
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-2 rounded-md font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "#6C63FF",
            color: "white",
          }}
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        {/* Footer */}
        <p className="text-gray-400 text-sm text-center mt-6">
          Didn’t receive code? <span style={{ color: "#6C63FF" }}>Resend</span>
        </p>
      </div>
    </div>
  );
};

export default Otp;
