import React, { useState } from "react";
import axios from "axios";
import { connection, startConnection } from "../services/signalRConnection";

const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
const API_URL = "https://chatapp-realtime-50bf.onrender.com";
  const handleLogin = async () => {
    if (!username || !password) return setError("Enter both username and password");
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_URL}/api/users/login`, {
        username,
        password,
      });
      const user = res.data;

      // Store user in session storage
      sessionStorage.setItem("currentUser", JSON.stringify(user));

      await startConnection();
      await connection.invoke("Login", user.id);

      onLoginSuccess(user);
    } catch (err) {
      console.error(err);
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          ChatApp Login
        </h2>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Username</label>
          <input
            type="text"
            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button
          className={`w-full p-2 rounded text-white font-bold ${
            loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
          }`}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
