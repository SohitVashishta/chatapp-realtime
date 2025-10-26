import React, { useEffect, useState, useRef } from "react";
import Picker from "emoji-picker-react";
import { connection, startConnection } from "../services/signalRConnection";

const ChatWindow = ({ currentUser, onLogout }) => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [message, setMessage] = useState("");
    const [allChats, setAllChats] = useState({});
    const [notifications, setNotifications] = useState({});
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef(null);
    const API_URL = "https://chatapp-realtime-50bf.onrender.com";

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [allChats, selectedUser]);

    // SignalR & fetch users
    useEffect(() => {
        const init = async () => {
            try {
                if (connection.state !== "Connected") await startConnection();
                if (connection.state === "Connected") await connection.invoke("Login", currentUser.id);
                else {
                    setTimeout(init, 1000);
                    return;
                }

                connection.off("ReceiveMessage");
                connection.on(
                    "ReceiveMessage",
                    (senderId, receiverId, messageText, messageType, fileName) => {
                        if (senderId === currentUser.id) return;
                        const otherUserId = String(senderId === currentUser.id ? receiverId : senderId);

                        const msg = {
                            senderId,
                            type: messageType || "text",
                            fileName,
                            senderUsername:
                                senderId === currentUser.id ? currentUser.username : "Other",
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
                    }
                );

                const res = await fetch(`${API_URL}/api/users`);
                const data = await res.json();
                setUsers(data.filter((u) => u.id !== currentUser.id));
            } catch (err) {
                console.error(err);
            }
        };
        init();
        return () => connection.off("ReceiveMessage");
    }, [currentUser, selectedUser]);

    const sendMessage = async (msg, type = "text", fileName = null) => {
        if ((!msg && type === "text") || !selectedUser) return;

        try {
            await connection.invoke(
                "SendMessage",
                selectedUser.id,
                msg,
                type,
                fileName
            );

            const newMsg = {
                senderId: currentUser.id,
                receiverId: selectedUser.id,
                message: msg,
                type,
                fileName,
            };

            setAllChats((prev) => ({
                ...prev,
                [String(selectedUser.id)]: [
                    ...(prev[String(selectedUser.id)] || []),
                    newMsg,
                ],
            }));

            if (type === "text") setMessage("");
            setShowEmojiPicker(false);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMessages = async (user) => {
        const res = await fetch(
            `${API_URL}/api/users/messages/${currentUser.id}/${user.id}`
        );
        const msgs = await res.json();

        const formatted = msgs.map((m) => ({
            senderId: m.senderId,
            type: m.type || "text",
            fileName: m.fileName,
            senderUsername:
                m.senderId === currentUser.id ? currentUser.username : user.username,
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

    // Emoji click
    const onEmojiClick = (emojiData) => {
        setMessage((prev) => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

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
        <div className="flex flex-col h-screen bg-gray-100">

            {/* Top bar */}
            <div className="flex justify-between items-center p-4 bg-white shadow flex-shrink-0">
                <h2 className="font-bold text-lg truncate">{currentUser.username}</h2>
                <button
                    onClick={handleLogoutClick}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                    Logout
                </button>
            </div>

            {/* User list */}
            <div className="flex overflow-x-auto p-2 space-x-3 bg-white border-b shadow flex-shrink-0">
                {users.map((u) => (
                    <div
                        key={u.id}
                        onClick={() => handleUserClick(u)}
                        className="relative flex flex-col items-center cursor-pointer flex-shrink-0"
                    >
                        <div
                            className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg ${selectedUser?.id === u.id
                                    ? "border-2 border-blue-500 bg-blue-400"
                                    : "bg-gray-400"
                                }`}
                        >
                            {u.username[0].toUpperCase()}
                        </div>
                        {notifications[String(u.id)] > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">
                                {notifications[String(u.id)]}
                            </span>
                        )}
                        <span className="text-xs mt-1 text-center truncate w-10 sm:w-14">
                            {u.username}
                        </span>
                    </div>
                ))}
            </div>

            {/* Chat container */}
            <div className="flex-1 flex flex-col overflow-hidden p-2">
                {selectedUser ? (
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto space-y-2 flex flex-col">
                            {(allChats[String(selectedUser.id)] || []).map((c, i) => {
                                let content;
                                if (c.type === "text") content = <span>{c.message}</span>;
                                else if (c.type === "image" && c.message) {
                                    content = (
                                        <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-lg overflow-hidden">
                                            <img
                                                src={c.message.startsWith("data:") ? c.message : `data:image/jpeg;base64,${c.message}`}
                                                alt="sent"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    );
                                }

                                else if (c.type === "file" && c.message)
                                    content = (
                                        <a
                                            href={`data:application/octet-stream;base64,${c.message}`}
                                            download={c.fileName}
                                            className="underline text-blue-700 break-all"
                                        >
                                            {c.fileName}
                                        </a>
                                    );

                                return (
                                    <div
                                        key={i}
                                        className={`flex ${c.senderId === currentUser.id ? "justify-end" : "justify-start"
                                            }`}
                                    >
                                        <div
                                            className={`inline-block max-w-[70vw] p-2 rounded-2xl break-words whitespace-normal ${c.senderId === currentUser.id
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-white text-gray-800"
                                                }`}
                                        >
                                            {content}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="flex flex-wrap items-center gap-2 p-2 bg-white border-t rounded-t-lg relative">
                            <button
                                onClick={() => setShowEmojiPicker((prev) => !prev)}
                                className="text-2xl"
                            >
                                😊
                            </button>
                            {showEmojiPicker && (
                                <div className="absolute bottom-16 z-50">
                                    <Picker onEmojiClick={(e) => setMessage((prev) => prev + e.emoji)} />
                                </div>
                            )}
                            <label className="cursor-pointer p-2 hover:bg-gray-200 rounded-full">
                                📎
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </label>
                            <label className="cursor-pointer p-2 hover:bg-gray-200 rounded-full">
                                📸
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                />
                            </label>
                            <input
                                type="text"
                                placeholder="Message..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage(message)}
                                className="flex-1 min-w-[50%] px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <button
                                onClick={() => sendMessage(message)}
                                className={`bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 ${!message.trim() && "opacity-50 cursor-not-allowed"
                                    }`}
                                disabled={!message.trim()}
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
