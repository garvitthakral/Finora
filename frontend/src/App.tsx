import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login_signup/login";
import Users from "./pages/users/users";
import Dashboard from "./pages/dashboard/dashboard";
import ProtectedRoute from "./routes/protectedRoutes";
import Signup from "./pages/login_signup/signup";
import Otp from "./pages/otp/Otp";
import CreateUser from "./pages/createUser/CreateUser";
import Unauthorized from "./pages/unauthorized/Unauthorized";

const App = () => {
  return (
    <BrowserRouter>
      <div>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "ANALYST", "VIEWER"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/otp" element={<Otp />} />
          <Route path="/create-user" element={<CreateUser />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
