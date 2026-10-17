using Overclock.Modules.GameEngine.Domain.Cards;

namespace Overclock.Modules.GameEngine.Domain.Rooms;

public sealed record PlayedTurn(
    PlayerId PlayerId,
    IReadOnlyList<Card> Cards,
    CardProtocol DeclaredProtocol,
    DateTimeOffset TimestampUtc);
