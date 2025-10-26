import { useState } from "react";
import Picker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';

const MessageInput = ({ message, setMessage, sendMessage, handleFileChange }) => {
  const [showEmoji, setShowEmoji] = useState(false);

  const addEmoji = (emoji) => {
    setMessage((prev) => prev + emoji.native);
  };

  return (
    <div className="flex items-center px-4 py-2 bg-white border-t shadow-inner relative">
      {/* Emoji / Attach / Camera buttons */}
      <div className="flex items-center space-x-2">
        <button
          className="p-2 rounded-full hover:bg-gray-200"
          onClick={() => setShowEmoji(!showEmoji)}
        >
          😊
        </button>
        <label className="p-2 rounded-full hover:bg-gray-200 cursor-pointer">
          📎
          <input type="file" className="hidden" onChange={handleFileChange} />
        </label>
        <label className="p-2 rounded-full hover:bg-gray-200 cursor-pointer">
          📸
          <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
        </label>
      </div>

      {/* Message input */}
      <input
        type="text"
        placeholder="Message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage(message, "text")}
        className="flex-1 mx-2 px-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {/* Send button */}
      <button
        onClick={() => sendMessage(message, "text")}
        className={`text-blue-500 font-semibold px-3 py-1 rounded-full ${
          message.trim() ? "opacity-100" : "opacity-50 cursor-not-allowed"
        }`}
        disabled={!message.trim()}
      >
        Send
      </button>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="absolute bottom-14 left-4 z-50">
          <Picker data={emojiData} onEmojiSelect={addEmoji} theme="light" />
        </div>
      )}
    </div>
  );
};

export default MessageInput;
