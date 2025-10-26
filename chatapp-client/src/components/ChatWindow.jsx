import React, { useEffect, useState, useRef } from "react";
import { connection, startConnection } from "../services/signalRConnection";

const ChatWindow = ({ currentUser, onLogout }) => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [message, setMessage] = useState("");
    const [allChats, setAllChats] = useState({});
    const [notifications, setNotifications] = useState({});
    const [chatBackground, setChatBackground] = useState("#f0f0f0");
    const messagesEndRef = useRef(null);
    const API_URL = process.env.REACT_APP_API_URL;
    // Scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current)
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [allChats, selectedUser]);

    // Initialize SignalR
    useEffect(() => {
        const init = async () => {
            try {
                if (connection.state !== "Connected") await startConnection();

                if (connection.state === "Connected")
                    await connection.invoke("Login", currentUser.id);
                else {
                    setTimeout(init, 1000);
                    return;
                }

                // Remove old listener and add new one
                connection.off("ReceiveMessage");
                connection.on("ReceiveMessage", (senderId, receiverId, messageText, messageType, fileName) => {
                    // ⚠️ Skip if current user is sender (because message already added locally)
                    if (senderId === currentUser.id) return;

                    const otherUserId = String(senderId === currentUser.id ? receiverId : senderId);

                    const msg = {
                        senderId,
                        type: messageType || "text",
                        fileName,
                        senderUsername: senderId === currentUser.id ? currentUser.username : "Other",
                        message: messageText,
                    };

                    setAllChats((prev) => ({
                        ...prev,
                        [otherUserId]: [...(prev[otherUserId] || []), msg],
                    }));

                    if (!selectedUser || String(selectedUser.id) !== otherUserId) {
                        setNotifications((prev) => ({
                            ...prev,
                            [otherUserId]: (prev[otherUserId] || 0) + 1,
                        }));
                    }
                });


                // Fetch users
                const res = await fetch(`${API_URL}/api/users`);
                const data = await res.json();
                setUsers(data.filter((u) => u.id !== currentUser.id));
            } catch (err) {
                console.error(err);
            }
        };
        init();

        return () => connection.off("ReceiveMessage");
    }, [currentUser]);

    // ✅ Send text or file messages
    const sendMessage = async (msg, type = "text", fileName = null) => {
        if ((!msg && type === "text") || !selectedUser) return;

        try {
            await connection.invoke("SendMessage", selectedUser.id, msg, type, fileName);

            // Add message locally so sender sees it instantly
            const newMsg = {
                senderId: currentUser.id,
                receiverId: selectedUser.id,
                message: msg,
                type,
                fileName,
            };

            setAllChats((prev) => ({
                ...prev,
                [String(selectedUser.id)]: [...(prev[String(selectedUser.id)] || []), newMsg],
            }));

            if (type === "text") setMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const fetchMessages = async (user) => {
        const res = await fetch(`${API_URL}/api/users/messages/${currentUser.id}/${user.id}`);
        const msgs = await res.json();

        const formatted = msgs.map((m) => ({
            senderId: m.senderId,
            type: m.type || "text",
            fileName: m.fileName,
            senderUsername: m.senderId === currentUser.id ? currentUser.username : user.username,
            message: m.type === "text" ? m.text : m.fileBase64 || "",
        }));

        setAllChats((prev) => ({
            ...prev,
            [String(user.id)]: formatted,
        }));
    };

    const handleUserClick = async (user) => {
        setSelectedUser(user);
        setNotifications((prev) => ({ ...prev, [String(user.id)]: 0 }));
        sessionStorage.setItem("lastSelectedUser", JSON.stringify(user));
        await fetchMessages(user);
    };

    // Restore last selected user
    useEffect(() => {
        const lastUser = sessionStorage.getItem("lastSelectedUser");
        if (lastUser) handleUserClick(JSON.parse(lastUser));
    }, []);

    // ✅ Handle file uploads (image or other)
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedUser) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("senderId", currentUser.id);
        formData.append("receiverId", selectedUser.id);

        try {
            const res = await fetch(`${API_URL}/api/files/upload`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            // Now send via SignalR
            await sendMessage(data.fileBase64, data.type, file.name);
        } catch (err) {
            console.error("File upload failed:", err);
        }

        e.target.value = null;
    };

    const handleLogoutClick = () => {
        sessionStorage.removeItem("currentUser");
        sessionStorage.removeItem("lastSelectedUser");
        onLogout();
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Users List */}
            <div className="w-1/4 border-r p-4 overflow-y-auto bg-white shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg">{currentUser.username}</h2>
                    <button
                        onClick={handleLogoutClick}
                        className="text-sm bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                        Logout
                    </button>
                </div>
                {users.map((u) => (
                    <div
                        key={u.id}
                        onClick={() => handleUserClick(u)}
                        className={`flex justify-between items-center p-2 rounded cursor-pointer mb-1 ${selectedUser?.id === u.id ? "bg-blue-100" : "hover:bg-gray-200"
                            }`}
                    >
                        <span className="font-medium">{u.username}</span>
                        {notifications[String(u.id)] > 0 && (
                            <span className="bg-red-500 text-white rounded-full text-xs px-2 py-0.5">
                                {notifications[String(u.id)]}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col p-4">
                {selectedUser ? (
                    <>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="font-bold text-lg border-b pb-2">{selectedUser.username}</h2>
                            <input
                                type="color"
                                value={chatBackground}
                                onChange={(e) => setChatBackground(e.target.value)}
                                className="w-10 h-8 rounded cursor-pointer"
                            />
                        </div>

                        <div
                            className="flex-1 overflow-y-auto p-3 rounded-lg shadow-inner flex flex-col space-y-2"
                            style={{ backgroundColor: chatBackground }}
                        >
                            {(allChats[String(selectedUser.id)] || []).map((c, i) => {
                                let content;

                                if (c.type === "text") {
                                    content = <span>{c.message}</span>;
                                } else if (c.type === "image" && c.message) {
                                    content = (
                                        <div className="w-[250px] h-[200px] overflow-hidden rounded-lg">
                                            <img
                                                src={
                                                    c.message.startsWith("data:")
                                                        ? c.message
                                                        : `data:image/jpeg;base64,${c.message}`
                                                }
                                                alt="sent"
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                    );
                                } else if (c.type === "file" && c.message) {
                                    content = (
                                        <a
                                            href={`data:application/octet-stream;base64,${c.message}`}
                                            download={c.fileName}
                                            className="underline text-blue-700"
                                        >
                                            {c.fileName}
                                        </a>
                                    );
                                }

                                return (
                                    <div
                                        key={i}
                                        className={`max-w-[70%] p-2 rounded-lg shadow break-words ${c.senderId === currentUser.id
                                                ? "self-end bg-blue-500 text-white"
                                                : "self-start bg-white text-gray-800"
                                            }`}
                                    >
                                        {content}
                                    </div>
                                );
                            })}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="flex items-center space-x-2 mt-2">
                            <input
                                className="flex-1 border rounded-full p-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="Message..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage(message, "text")}
                            />
                            <label className="cursor-pointer bg-gray-200 p-2 rounded-full hover:bg-gray-300">
                                📎
                                <input type="file" className="hidden" onChange={handleFileChange} />
                            </label>
                            <label className="cursor-pointer bg-gray-200 p-2 rounded-full hover:bg-gray-300">
                                📸
                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                            </label>
                            <button
                                onClick={() => sendMessage(message, "text")}
                                className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
                            >
                                Send
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">
                        Select a user to start chat
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;
