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
    public void PlayCards_Fails_WhenEveryRivalHasEmptiedTheirHand_LastHolderMustCallTrace()
    {
        var (room, hostId, p2Id) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0));

        var hostSeat = room.Seats[0];
        var p2Seat = room.Seats[1];

        var hCards = hostSeat.Hand.Take(2).ToList();
        var p2Cards = p2Seat.Hand.Take(2).ToList();
        hostSeat.AssignHand(hCards);
        p2Seat.AssignHand(p2Cards);

        // Host plays their last cards; P2 is now the only player holding cards.
        var t1 = room.PlayCards(hostId, hCards.Select(c => c.Id).ToList(), CardProtocol.Alpha);
        Assert.True(t1.IsSuccess);
        Assert.Empty(hostSeat.Hand);
        Assert.Equal(p2Id, room.CurrentTurnPlayerId);

        // P2 cannot keep playing alone — nobody would be left to challenge them.
        var t2 = room.PlayCards(p2Id, p2Cards.Select(c => c.Id).ToList(), CardProtocol.Alpha);
        Assert.False(t2.IsSuccess);
        Assert.Contains(t2.ValidationErrors, e => e.Identifier == "Turn.MustCallTrace");
        Assert.Equal(2, p2Seat.Hand.Count);
        Assert.Equal(RoomState.TurnActive, room.State);

        // TRACE is the only way forward and resolves into a voltage test.
        var trace = room.CallTrace(p2Id);
        Assert.True(trace.IsSuccess);
        Assert.Equal(RoomState.BluffCheck, room.State);
    }

    [Fact]
    public void ExpireTurn_AutoTraces_WhenLastHolderRunsOutOfTime()
    {
        var (room, hostId, p2Id) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0));

        var hCards = room.Seats[0].Hand.Take(1).ToList();
        room.Seats[0].AssignHand(hCards);
        room.PlayCards(hostId, hCards.Select(c => c.Id).ToList(), CardProtocol.Alpha);

        var expired = room.ExpireTurn(p2Id, room.TurnSequenceId);

        Assert.True(expired.IsSuccess);
        Assert.IsType<TurnExpiredOutcome.AutoTrace>(expired.Value);
        Assert.Equal(RoomState.BluffCheck, room.State);
    }

    [Fact]
    public void PlayCards_StillAllowed_WhenAnotherRivalHoldsCards()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var p3Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-209"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-2", Guid.NewGuid());
        room.AddPlayer(p3Id, "Player3", "conn-3", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.SetReady(p3Id, true);
        room.StartRound(hostId, new ConstantRandomSource(0));

        var hCards = room.Seats[0].Hand.Take(1).ToList();
        room.Seats[0].AssignHand(hCards);
        room.PlayCards(hostId, hCards.Select(c => c.Id).ToList(), CardProtocol.Alpha);

        // P3 still holds cards, so P2 may keep bluffing instead of tracing.
        var t2 = room.PlayCards(p2Id, [room.Seats[1].Hand[0].Id], CardProtocol.Alpha);

        Assert.True(t2.IsSuccess);
        Assert.Equal(p3Id, room.CurrentTurnPlayerId);
    }

    [Fact]
    public void StartRound_CanStartRoundTwo_AfterRoundOver()
    {
        var (room, hostId, p2Id) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0));

        // Host plays cards -> turn rotates to P2
        room.PlayCards(hostId, [room.Seats[0].Hand[0].Id], CardProtocol.Alpha);

        // P2 calls trace -> BluffCheck -> VoltageTest -> RoundOver
        room.CallTrace(p2Id);
        room.CompleteBluffCheck();
        room.DischargeCapacitor(room.PendingDischargePlayerId!.Value, new ConstantRandomSource(6));

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

    [Fact]
    public void MarkTurnDeadline_SetsCurrentTurnDeadlineUtc_WhenInTurnActive()
    {
        var (room, hostId, _) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0));
        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Null(room.CurrentTurnDeadlineUtc);

        var deadline = DateTime.UtcNow.AddSeconds(15);
        var result = room.MarkTurnDeadline(deadline);

        Assert.True(result.IsSuccess);
        Assert.Equal(deadline, room.CurrentTurnDeadlineUtc);
    }

    [Fact]
    public void MarkTurnDeadline_ReturnsInvalid_WhenNotInTurnActive()
    {
        var (room, _, _) = CreateReadyRoom();
        Assert.Equal(RoomState.Lobby, room.State);

        var result = room.MarkTurnDeadline(DateTime.UtcNow.AddSeconds(15));

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, result.Status);
        Assert.Contains(result.ValidationErrors, e => e.Identifier == "Room.NotInTurnActive");
        Assert.Null(room.CurrentTurnDeadlineUtc);
    }

    [Fact]
    public void StateTransitions_AwayFromTurnActive_ClearsCurrentTurnDeadlineUtc()
    {
        var (room, hostId, p2Id) = CreateReadyRoom();
        room.StartRound(hostId, new ConstantRandomSource(0));
        var deadline = DateTime.UtcNow.AddSeconds(15);
        room.MarkTurnDeadline(deadline);
        Assert.Equal(deadline, room.CurrentTurnDeadlineUtc);

        // Host plays cards -> rotates turn to P2 -> deadline is cleared until rescheduled
        room.PlayCards(hostId, [room.Seats[0].Hand[0].Id], CardProtocol.Alpha);
        Assert.Null(room.CurrentTurnDeadlineUtc);

        // Set deadline again for P2's turn
        room.MarkTurnDeadline(deadline);
        Assert.Equal(deadline, room.CurrentTurnDeadlineUtc);

        // P2 calls trace -> BluffCheck state -> deadline is cleared
        room.CallTrace(p2Id);
        Assert.Equal(RoomState.BluffCheck, room.State);
        Assert.Null(room.CurrentTurnDeadlineUtc);
    }
}
