using System.ComponentModel.DataAnnotations.Schema;

namespace ChatApp.API.Models
{
    public class Message
    {
        public int Id { get; set; }
        public int SenderId { get; set; }
        public int? ReceiverId { get; set; }  // null = group chat
        public string? Text { get; set; } = string.Empty;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public User Sender { get; set; } = null!;

        [ForeignKey("ReceiverId")]
        public User? Receiver { get; set; }  // optional
        public string Type { get; set; } = "text"; // text | image | public int Id { get; set; }
        public byte[]? FileBytes { get; set; }    // for images/files
        public string? FileName { get; set; }     // original file name

    }
}
