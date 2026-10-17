using System.Text.RegularExpressions;
using Ardalis.Result;

namespace Overclock.Modules.GameEngine.Domain.Rooms;

public readonly partial record struct RoomId
{
    [GeneratedRegex("^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$")]
    private static partial Regex RoomCodeRegex();

    public string Value { get; }

    private RoomId(string value)
    {
        Value = value.ToUpperInvariant();
    }

    public static bool IsValid(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length is < 3 or > 20)
        {
            return false;
        }

        return RoomCodeRegex().IsMatch(value);
    }

    /// <summary>
    /// Factory for application/domain code. Returns a functional Result without throwing exceptions (ADR 0006).
    /// </summary>
    public static Result<RoomId> Create(string value)
    {
        if (!IsValid(value))
        {
            return Result<RoomId>.Invalid(new ValidationError(
                "Room.InvalidId",
                $"Invalid room code '{value}'. Must be 3-20 alphanumeric characters, optionally hyphen-separated."));
        }

        return Result<RoomId>.Success(new RoomId(value));
    }

    /// <summary>
    /// Test and compile-time constant factory. For production untrusted input, use <see cref="Create"/> instead.
    /// </summary>
    public static RoomId New(string value)
    {
        var result = Create(value);
        if (!result.IsSuccess)
        {
            throw new ArgumentException($"Invalid room code '{value}'.", nameof(value));
        }

        return result.Value;
    }

    public override string ToString() => Value ?? string.Empty;
}
