using Overclock.Modules.GameEngine.Domain.Cards;

namespace Overclock.Modules.GameEngine.Domain.Rooms;

public sealed record TraceResolution(
    PlayerId AccuserPlayerId,
    PlayerId AccusedPlayerId,
    PlayerId LoserPlayerId,
    IReadOnlyList<Card> RevealedCards,
    CardProtocol DeclaredProtocol,
    bool BluffDetected);
