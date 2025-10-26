import React, { useEffect, useState } from "react";
import LoginPage from "./components/LoginPage";
import ChatWindow from "./components/ChatWindow";

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const savedUser = sessionStorage.getItem("currentUser");
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    sessionStorage.setItem("loginTime", Date.now());
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("loginTime");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const loginTime = sessionStorage.getItem("loginTime");
      if (loginTime && Date.now() - parseInt(loginTime, 10) > 30 * 60 * 1000) {
        handleLogout();
        alert("Session expired. Please log in again.");
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      {!currentUser ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <ChatWindow currentUser={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
