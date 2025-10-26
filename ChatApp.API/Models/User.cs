using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ChatApp.API.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = "";

        [Required]
        [MaxLength(100)]
        public string Password { get; set; } = "";

        // Navigation properties
        public ICollection<Message> SentMessages { get; set; } = new List<Message>();
        public ICollection<Message> ReceivedMessages { get; set; } = new List<Message>();
    }
}
