using ChatApp.API.Data;
using ChatApp.API.Models;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class FilesController : ControllerBase
{
    private readonly AppDbContext _context;
    public FilesController(AppDbContext context) => _context = context;

    [HttpPost("upload")]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] int senderId, [FromForm] int receiverId)
    {
        if (file == null || file.Length == 0) return BadRequest("No file uploaded");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();

        string base64 = $"data:{file.ContentType};base64,{Convert.ToBase64String(bytes)}";

        var message = new Message
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            Text = string.Empty,
            FileBytes = bytes,
            FileName = file.FileName,
            Type = file.ContentType.StartsWith("image/") ? "image" : "file",
            SentAt = DateTime.UtcNow
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        return Ok(new { fileBase64 = base64, type = message.Type });
    }
}
