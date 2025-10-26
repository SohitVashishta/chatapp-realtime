using ChatApp.API.Data;
using ChatApp.API.Models;
using Microsoft.AspNetCore.SignalR;

namespace ChatApp.API.Hubs
{
    public class ChatHub : Hub
    {
        private readonly AppDbContext _context;
        public ChatHub(AppDbContext context) => _context = context;

        public async Task Login(int userId)
        {
            Context.Items["userId"] = userId;
            await Groups.AddToGroupAsync(Context.ConnectionId, userId.ToString());
        }

        public async Task SendMessage(int receiverId, string message, string type, string fileName)
        {
            if (!Context.Items.ContainsKey("userId")) return;
            int senderId = int.Parse(Context.Items["userId"].ToString());

            var msg = new Message
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                Text = type == "text" ? message : string.Empty,
                Type = type,
                FileName = fileName,
                SentAt = DateTime.UtcNow
            };

            if ((type == "image" || type == "file") && message.StartsWith("data:"))
            {
                var base64Data = message.Substring(message.IndexOf(",") + 1);
                msg.FileBytes = Convert.FromBase64String(base64Data);
            }


            _context.Messages.Add(msg);
            await _context.SaveChangesAsync();

            // Send message to both sender and receiver
            await Clients.All.SendAsync("ReceiveMessage", senderId, receiverId, message, type, fileName);
        }
    }
}
