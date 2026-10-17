using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;
using Xunit;

namespace Overclock.Modules.GameEngine.Domain.Tests.Rooms;

public class GameRoomGameplayTests
{
    private sealed class ConstantRandomSource(int fixedValue) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => fixedValue;
    }

    private static (GameRoom Room, PlayerId HostId, PlayerId P2Id) CreateReadyRoom()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-200"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-2", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        return (room, hostId, p2Id);
    }

    [Fact]
    public void StartRound_Fails_WhenFewerThanTwoPlayers()
    {
        var hostId = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-201"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;
        room.SetReady(hostId, true);

        var result = room.StartRound(hostId);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, result.Status);
        Assert.Contains(result.ValidationErrors, e => e.Identifier == "Room.InsufficientPlayers");
    }

    [Fact]
    public void StartRound_Fails_WhenNotAllPlayersAreReady()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-202"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-2", Guid.NewGuid());
        room.SetReady(hostId, true);
        // Player 2 is not ready

        var result = room.StartRound(hostId);

        Assert.False(result.IsSuccess);
        Assert.Contains(result.ValidationErrors, e => e.Identifier == "Room.NotAllPlayersReady");
    }

    [Fact]
    public void StartRound_Fails_WhenRequesterIsNotHost()
    {
        var (room, _, p2Id) = CreateReadyRoom();

        var result = room.StartRound(p2Id); // Non-host tries to start

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, result.Status);
        Assert.Contains(result.ValidationErrors, e => e.Identifier == "Room.OnlyHostCanStart");
    }

    [Fact]
    public void StartRound_DealsHands_SetsTargetProtocol_AndTransitionsToTurnActive()
    {
        var (room, hostId, p2Id) = CreateReadyRoom();
        var rng = new ConstantRandomSource(0); // 0 corresponds to CardProtocol.Alpha

        var result = room.StartRound(hostId, rng);

        Assert.True(result.IsSuccess);
        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(1, room.RoundNumber);
        Assert.Equal(CardProtocol.Alpha, room.CurrentTargetProtocol);
        Assert.NotNull(room.CurrentDeck);
        Assert.Equal(hostId, room.CurrentTurnPlayerId);

        // Each player should have 5 cards
        Assert.Equal(5, room.Seats[0].Hand.Count);
        Assert.Equal(5, room.Seats[1].Hand.Count);
        Assert.Empty(room.TablePile);
        Assert.Null(room.LastPlay);
    }

    [Fact]
    public void PlayCards_RemovesCardsFromHand_AddsToTablePile_AndAdvancesTurn()
    {
        var (room, hostId, p2Id) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0)); // Target protocol Alpha

        var hostSeat = room.Seats[0];
        var cardsToPlay = hostSeat.Hand.Take(2).Select(c => c.Id).ToList();

        var playResult = room.PlayCards(hostId, cardsToPlay, CardProtocol.Alpha);

        Assert.True(playResult.IsSuccess);
        Assert.Equal(3, hostSeat.Hand.Count);
        Assert.Equal(2, room.TablePile.Count);
        Assert.NotNull(room.LastPlay);
        Assert.Equal(hostId, room.LastPlay.PlayerId);
        Assert.Equal(2, room.LastPlay.Cards.Count);
        Assert.Equal(CardProtocol.Alpha, room.LastPlay.DeclaredProtocol);

        // Turn should have rotated to Player 2
        Assert.Equal(p2Id, room.CurrentTurnPlayerId);
    }

    [Fact]
    public void PlayCards_Fails_WhenNotPlayerTurn()
    {
        var (room, hostId, p2Id) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0));

        var p2Seat = room.Seats[1];
        var cards = p2Seat.Hand.Take(1).Select(c => c.Id).ToList();

        // Player 2 attempts to play during Host's turn
        var playResult = room.PlayCards(p2Id, cards, CardProtocol.Alpha);

        Assert.False(playResult.IsSuccess);
        Assert.Contains(playResult.ValidationErrors, e => e.Identifier == "Turn.NotYourTurn");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    public void PlayCards_Fails_WhenCardCountOutsideAllowedRange(int cardCount)
    {
        var (room, hostId, _) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0));

        var hostSeat = room.Seats[0];
        var cardIds = hostSeat.Hand.Take(cardCount).Select(c => c.Id).ToList();

        var playResult = room.PlayCards(hostId, cardIds, CardProtocol.Alpha);

        Assert.False(playResult.IsSuccess);
        Assert.Contains(playResult.ValidationErrors, e => e.Identifier == "Turn.InvalidCardCount");
    }

    [Fact]
    public void PlayCards_Fails_WhenDuplicateCardIdsPassed()
    {
        var (room, hostId, _) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0));

        var hostCardId = room.Seats[0].Hand[0].Id;

        var playResult = room.PlayCards(hostId, [hostCardId, hostCardId], CardProtocol.Alpha);

        Assert.False(playResult.IsSuccess);
        Assert.Contains(playResult.ValidationErrors, e => e.Identifier == "Turn.DuplicateCardIds");
    }

    [Fact]
    public void PlayCards_Fails_WhenDeclaredProtocolDoesNotMatchTarget()
    {
        var (room, hostId, _) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0)); // Target: Alpha

        var hostSeat = room.Seats[0];
        var cards = hostSeat.Hand.Take(1).Select(c => c.Id).ToList();

        var playResult = room.PlayCards(hostId, cards, CardProtocol.Beta);

        Assert.False(playResult.IsSuccess);
        Assert.Contains(playResult.ValidationErrors, e => e.Identifier == "Turn.MismatchedProtocol");
    }

    [Fact]
    public void PlayCards_Fails_WhenPlayerDoesNotHoldCards()
    {
        var (room, hostId, _) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0));

        var foreignCardId = CardId.New();

        var playResult = room.PlayCards(hostId, [foreignCardId], CardProtocol.Alpha);

        Assert.False(playResult.IsSuccess);
        Assert.Contains(playResult.ValidationErrors, e => e.Identifier == "Hand.MissingCards");
    }

    [Fact]
    public void PlayCards_SkipsPlayersWithEmptyHands_AndEndsRoundWhenAllHandsEmpty()
    {
        var (room, hostId, p2Id) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0));

        var hostSeat = room.Seats[0];
        var p2Seat = room.Seats[1];

        // Give each player exactly 2 cards for a compact test
        var hCards = hostSeat.Hand.Take(2).ToList();
        var p2Cards = p2Seat.Hand.Take(2).ToList();
        hostSeat.AssignHand(hCards);
        p2Seat.AssignHand(p2Cards);

        // Turn 1: Host plays all 2 cards (Host hand is now empty)
        var t1 = room.PlayCards(hostId, hCards.Select(c => c.Id).ToList(), CardProtocol.Alpha);
        Assert.True(t1.IsSuccess);
        Assert.Empty(hostSeat.Hand);
        Assert.Equal(p2Id, room.CurrentTurnPlayerId);

        // Turn 2: P2 decides to play rather than call TRACE. P2 plays all 2 cards (now both hands empty)
        var t2 = room.PlayCards(p2Id, p2Cards.Select(c => c.Id).ToList(), CardProtocol.Alpha);
        Assert.True(t2.IsSuccess);
        Assert.Empty(p2Seat.Hand);

        // Deadlock prevented: round cleanly transitions to RoundOver with no soft-lock!
        Assert.Equal(RoomState.RoundOver, room.State);
        Assert.Null(room.CurrentTurnPlayerId);
    }

    [Fact]
    public void StartRound_CanStartRoundTwo_AfterRoundOver()
    {
        var (room, hostId, p2Id) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0));

        // Host plays cards -> turn rotates to P2
        room.PlayCards(hostId, [room.Seats[0].Hand[0].Id], CardProtocol.Alpha);

        // P2 calls trace -> BluffCheck -> RoundOver
        room.CallTrace(p2Id);
        room.CompleteBluffCheck();

        Assert.Equal(RoomState.RoundOver, room.State);

        // Host starts Round 2
        var r2Result = room.StartRound(hostId, new ConstantRandomSource(1)); // Protocol Beta

        Assert.True(r2Result.IsSuccess);
        Assert.Equal(2, room.RoundNumber);
        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(CardProtocol.Beta, room.CurrentTargetProtocol);
        Assert.Equal(5, room.Seats[0].Hand.Count);
        Assert.Equal(5, room.Seats[1].Hand.Count);
        Assert.Empty(room.TablePile);
    }
}
