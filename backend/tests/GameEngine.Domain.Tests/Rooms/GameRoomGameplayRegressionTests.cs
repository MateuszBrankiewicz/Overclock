using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Exploits;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;
using Xunit;

namespace Overclock.Modules.GameEngine.Domain.Tests.Rooms;

/// <summary>
/// Regression tests for gameplay-breaking bugs: soft-locks and eliminated players returning to play.
/// </summary>
public sealed class GameRoomGameplayRegressionTests
{
    private sealed class ConstantRandomSource(int fixedValue) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => fixedValue;
    }

    // Roll 6 on a 1/6 capacitor is always safe.
    private static readonly IRandomSource SafeRoll = new ConstantRandomSource(6);

    private static (GameRoom Room, PlayerId[] Ids) StartGame(int players)
    {
        var ids = Enumerable.Range(0, players).Select(_ => PlayerId.New()).ToArray();
        var room = GameRoom.Create(RoomId.New("CYBER-REG"), ids[0], "P0", "conn-0", Guid.NewGuid()).Value;
        for (var i = 1; i < players; i++)
        {
            room.AddPlayer(ids[i], $"P{i}", $"conn-{i}", Guid.NewGuid());
        }

        foreach (var id in ids)
        {
            room.SetReady(id, true);
        }

        // ConstantRandomSource(0) => target protocol Alpha, first seat leads.
        Assert.True(room.StartRound(ids[0], new ConstantRandomSource(0)).IsSuccess);
        Assert.Equal(CardProtocol.Alpha, room.CurrentTargetProtocol);
        return (room, ids);
    }

    private static PlayerSeat Seat(GameRoom room, PlayerId id) => room.Seats.First(s => s.Id == id);

    private static List<Card> Cards(params CardProtocol[] protocols) => protocols.Select(Card.Create).ToList();

    private static void Play(GameRoom room, PlayerId id, params Card[] cards) =>
        Assert.True(room.PlayCards(id, cards.Select(c => c.Id).ToList(), CardProtocol.Alpha).IsSuccess);

    // ---- Bug 1: an eliminated player who disconnects is counted as active again ----

    [Fact]
    public void Disconnect_OfEliminatedPlayer_KeepsSeatEliminated()
    {
        var (room, ids) = StartGame(3);
        room.EliminatePlayer(ids[2]);

        room.HandleDisconnect("conn-2");

        Assert.Equal(PlayerStatus.Eliminated, Seat(room, ids[2]).Status);
    }

    [Fact]
    public void Disconnect_OfEliminatedPlayer_DoesNotPreventGameOver()
    {
        var (room, ids) = StartGame(3);
        room.EliminatePlayer(ids[2]);
        room.HandleDisconnect("conn-2");

        room.EliminatePlayer(ids[1]);

        Assert.Equal(RoomState.GameOver, room.State);
        Assert.Equal(ids[0], room.WinnerId);
    }

    [Fact]
    public void Reconnect_OfEliminatedPlayerAfterDisconnect_DoesNotReviveSeat()
    {
        var (room, ids) = StartGame(3);
        var token = Seat(room, ids[2]).SessionToken;
        room.EliminatePlayer(ids[2]);
        room.HandleDisconnect("conn-2");

        room.HandleReconnect(token, "conn-2-new");

        Assert.Equal(PlayerStatus.Eliminated, Seat(room, ids[2]).Status);
    }

    // ---- Bug 2: turn returns to the player whose play is still pending (self-trace soft-lock) ----

    [Fact]
    public void PlayCards_WhenEveryRivalHasEmptyHand_IsRejectedSoTheTurnCannotSoftLock()
    {
        var (room, ids) = StartGame(2);
        var a = Cards(CardProtocol.Alpha);
        var b = Cards(CardProtocol.Beta, CardProtocol.Beta);
        Seat(room, ids[0]).AssignHand(a);
        Seat(room, ids[1]).AssignHand(b);

        Play(room, ids[0], a[0]);   // A empties hand

        // Last holder rule: B is the only one with cards and must call TRACE, not play on.
        var result = room.PlayCards(ids[1], [b[0].Id], CardProtocol.Alpha);

        Assert.False(result.IsSuccess);
        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(ids[1], room.CurrentTurnPlayerId);
        Assert.True(room.CallTrace(ids[1]).IsSuccess);
    }

    [Fact]
    public void ExpireTurn_WhenLastHolderMustTrace_ResolvesInsteadOfSoftLocking()
    {
        var (room, ids) = StartGame(2);
        var a = Cards(CardProtocol.Alpha);
        var b = Cards(CardProtocol.Beta, CardProtocol.Beta);
        Seat(room, ids[0]).AssignHand(a);
        Seat(room, ids[1]).AssignHand(b);
        Play(room, ids[0], a[0]);

        var expired = room.ExpireTurn(room.CurrentTurnPlayerId!.Value, room.TurnSequenceId);

        Assert.True(expired.IsSuccess);
        Assert.NotEqual(RoomState.TurnActive, room.State);
    }

    [Fact]
    public void EliminatePlayer_OfCurrentPlayer_DoesNotHandTurnToTheAuthorOfThePendingPlay()
    {
        var (room, ids) = StartGame(3);
        var a = Cards(CardProtocol.Beta, CardProtocol.Beta);
        Seat(room, ids[0]).AssignHand(a);
        Seat(room, ids[1]).AssignHand(Cards(CardProtocol.Alpha));
        Seat(room, ids[2]).AssignHand([]);

        Play(room, ids[0], a[0]);       // A plays, B's turn, C has no cards
        Assert.Equal(ids[1], room.CurrentTurnPlayerId);

        room.EliminatePlayer(ids[1]);   // B drops out (grace period) on his own turn

        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.NotEqual(ids[0], room.CurrentTurnPlayerId);
        Assert.True(room.CallTrace(room.CurrentTurnPlayerId!.Value).IsSuccess);
    }

    // ---- Bug 3: tracing a play by a player who already left leaves the room stuck in VoltageTest ----

    [Fact]
    public void CallTrace_AfterAuthorOfLastPlayLeft_DoesNotTargetEliminatedPlayer()
    {
        var (room, ids) = StartGame(3);
        var bluff = Cards(CardProtocol.Beta, CardProtocol.Gamma);
        Seat(room, ids[0]).AssignHand(bluff);

        Play(room, ids[0], bluff[0]);   // A bluffs
        room.Leave(ids[0]);             // ...and leaves before being traced
        Assert.Equal(RoomState.TurnActive, room.State);

        var trace = room.CallTrace(ids[1]);
        if (trace.IsSuccess)
        {
            room.CompleteBluffCheck();
            Assert.NotEqual(ids[0], room.PendingDischargePlayerId);
            Assert.True(room.DischargeCapacitor(room.PendingDischargePlayerId!.Value, SafeRoll).IsSuccess);
        }

        Assert.NotEqual(RoomState.VoltageTest, room.State);
    }

    [Fact]
    public void ExpireTurn_AfterAuthorOfLastPlayLeft_DoesNotLeaveRoomStuckInVoltageTest()
    {
        var (room, ids) = StartGame(3);
        var bluff = Cards(CardProtocol.Beta, CardProtocol.Gamma);
        Seat(room, ids[0]).AssignHand(bluff);
        Play(room, ids[0], bluff[0]);
        room.Leave(ids[0]);

        var expired = room.ExpireTurn(ids[1], room.TurnSequenceId);
        Assert.True(expired.IsSuccess);
        if (room.State == RoomState.BluffCheck)
        {
            room.CompleteBluffCheck();
        }

        Assert.NotNull(room.PendingDischargePlayerId);
        Assert.NotEqual(ids[0], room.PendingDischargePlayerId);
        Assert.True(room.DischargeCapacitor(room.PendingDischargePlayerId!.Value, SafeRoll).IsSuccess);
    }

    // ---- Bug 4: a rematch revives eliminated players who are no longer connected ----

    [Fact]
    public void StartRound_Rematch_DoesNotDealInDisconnectedPlayers()
    {
        var (room, ids) = StartGame(3);
        room.HandleDisconnect("conn-2");
        room.EliminatePlayer(ids[2]);   // grace period expired
        room.EliminatePlayer(ids[1]);   // regular elimination => GameOver
        Assert.Equal(RoomState.GameOver, room.State);

        var rematch = room.StartRound(ids[0], new ConstantRandomSource(0));

        Assert.True(rematch.IsSuccess);
        Assert.DoesNotContain(room.Seats, s => s.Id == ids[2] && s.Status != PlayerStatus.Eliminated);
        Assert.DoesNotContain(room.Seats, s => s.Id == ids[2] && s.Hand.Count > 0);
    }

    [Fact]
    public void StartRound_Rematch_StillIncludesPlayerEliminatedWhileConnected()
    {
        var (room, ids) = StartGame(3);
        room.EliminatePlayer(ids[2]);
        room.EliminatePlayer(ids[1]);
        Assert.Equal(RoomState.GameOver, room.State);

        Assert.True(room.StartRound(ids[0], new ConstantRandomSource(0)).IsSuccess);

        Assert.All(room.Seats, s => Assert.Equal(PlayerStatus.Active, s.Status));
        Assert.Equal(3, room.Seats.Count(s => s.Hand.Count > 0));
    }

    // ---- Bug 6: Overclock Injector extends the turn when less than 5 s are left ----

    [Fact]
    public void OverclockInjector_WhenLessThanFiveSecondsRemain_NeverExtendsTheTurn()
    {
        var (room, ids) = StartGame(2);
        var a = Cards(CardProtocol.Alpha, CardProtocol.Alpha);
        Seat(room, ids[0]).AssignHand(a);
        Seat(room, ids[0]).AssignExploit(new ExploitModule(ExploitType.OverclockInjector));
        Play(room, ids[0], a[0]);

        var now = new DateTime(2026, 11, 20, 12, 0, 0, DateTimeKind.Utc);
        room.MarkTurnDeadline(now.AddSeconds(2));

        var result = room.ActivateExploit(ids[0], ExploitType.OverclockInjector, nowUtc: now);

        var effect = Assert.IsType<ExploitEffect.TurnTimerShortened>(result.Value);
        Assert.True(effect.ShortenedDuration <= TimeSpan.FromSeconds(2),
            $"Injector set {effect.ShortenedDuration} while only 2 s were left.");
    }

    [Fact]
    public void OverclockInjector_WhenMoreThanFiveSecondsRemain_ShortensToFiveSeconds()
    {
        var (room, ids) = StartGame(2);
        var a = Cards(CardProtocol.Alpha, CardProtocol.Alpha);
        Seat(room, ids[0]).AssignHand(a);
        Seat(room, ids[0]).AssignExploit(new ExploitModule(ExploitType.OverclockInjector));
        Play(room, ids[0], a[0]);

        var now = new DateTime(2026, 11, 20, 12, 0, 0, DateTimeKind.Utc);
        room.MarkTurnDeadline(now.AddSeconds(12));

        var result = room.ActivateExploit(ids[0], ExploitType.OverclockInjector, nowUtc: now);

        var effect = Assert.IsType<ExploitEffect.TurnTimerShortened>(result.Value);
        Assert.Equal(ExploitCatalog.OverclockInjectorDuration, effect.ShortenedDuration);
    }
}
