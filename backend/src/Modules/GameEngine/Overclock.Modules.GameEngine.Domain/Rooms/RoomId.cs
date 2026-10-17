namespace Overclock.Modules.GameEngine.Domain.Rooms;

public readonly record struct RoomId(string Value)
{
    public static RoomId New(string value) => new(value);

    public override string ToString() => Value;
}
