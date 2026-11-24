using System.Globalization;
using Ardalis.Result;

namespace Overclock.Modules.GameEngine.Domain.Rooms;

/// <summary>
/// Normalizes and validates untrusted player nicknames before they become part of shared room state.
/// </summary>
public static class PlayerNickname
{
    public const int MaxLength = 24;

    // Allowed inside emoji sequences; other format characters (e.g. bidi overrides) are rejected.
    private const char ZeroWidthJoiner = '‍';

    public static Result<string> Normalize(string? raw)
    {
        var trimmed = raw?.Trim() ?? string.Empty;

        if (trimmed.Length == 0)
        {
            return Invalid("Player nickname cannot be empty.");
        }

        if (trimmed.Length > MaxLength)
        {
            return Invalid($"Player nickname cannot exceed {MaxLength} characters.");
        }

        foreach (var ch in trimmed)
        {
            if (ch == ZeroWidthJoiner)
            {
                continue;
            }

            var category = char.GetUnicodeCategory(ch);
            if (category is UnicodeCategory.Control
                or UnicodeCategory.Format
                or UnicodeCategory.LineSeparator
                or UnicodeCategory.ParagraphSeparator
                or UnicodeCategory.PrivateUse
                or UnicodeCategory.OtherNotAssigned)
            {
                return Invalid("Player nickname contains unsupported characters.");
            }
        }

        return Result<string>.Success(trimmed);
    }

    private static Result<string> Invalid(string message) =>
        Result<string>.Invalid(new ValidationError("Room.InvalidNickname", message));
}
