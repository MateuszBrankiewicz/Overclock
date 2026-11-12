namespace Overclock.Modules.GameEngine.Domain.Characters;

public static class CharacterCatalog
{
    public const string DefaultId = "ghost";

    public static readonly IReadOnlyList<string> All =
    [
        "ghost",
        "volt",
        "proxy",
        "null"
    ];

    public static bool IsValid(string? characterId) =>
        characterId is not null && All.Contains(characterId);
}
