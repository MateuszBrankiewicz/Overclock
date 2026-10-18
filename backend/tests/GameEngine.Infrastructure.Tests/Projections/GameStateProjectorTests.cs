using System.Text.Json;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Infrastructure.Tests.Projections;

public sealed class GameStateProjectorTests
{
    private sealed class DeterministicRandomSource(int fixedValue) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => fixedValue;
    }

    private static (GameRoom Room, PlayerId HostId, PlayerId P2Id, PlayerId P3Id) CreateActiveThreePlayerRoom()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var p3Id = PlayerId.New();

        var room = GameRoom.Create(
            RoomId.New("CYBER-PRJ3"),
            hostId,
            "HostAlice",
            "conn-alice",
            Guid.NewGuid()).Value;

        room.AddPlayer(p2Id, "GuestBob", "conn-bob", Guid.NewGuid());
        room.AddPlayer(p3Id, "GuestCharlie", "conn-charlie", Guid.NewGuid());

        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.SetReady(p3Id, true);

        room.StartRound(hostId, new DeterministicRandomSource(0));

        return (room, hostId, p2Id, p3Id);
    }

    private static (GameRoom Room, List<PlayerId> PlayerIds) CreateActiveFourPlayerRoom()
    {
        var hostId = PlayerId.New();
        var room = GameRoom.Create(
            RoomId.New("CYBER-PRJ4"),
            hostId,
            "HostPlayer",
            "conn-host",
            Guid.NewGuid()).Value;

        var playerIds = new List<PlayerId> { hostId };
        for (var i = 2; i <= 4; i++)
        {
            var pid = PlayerId.New();
            playerIds.Add(pid);
            room.AddPlayer(pid, $"Player{i}", $"conn-{i}", Guid.NewGuid());
        }

        foreach (var pid in playerIds)
        {
            room.SetReady(pid, true);
        }

        room.StartRound(hostId, new DeterministicRandomSource(0));
        return (room, playerIds);
    }

    [Fact]
    public void Project_RecipientSeesOwnCardsInPlaintext()
    {
        var (room, hostId, _, _) = CreateActiveThreePlayerRoom();
        var hostSeat = room.Seats.First(s => s.Id == hostId);

        var snapshot = GameStateProjector.Project(room, hostId);

        Assert.Equal(room.Id.Value, snapshot.RoomCode);
        Assert.Equal(hostId.Value, snapshot.MyPlayerId);
        Assert.Equal(hostSeat.Hand.Count, snapshot.MyHand.Count);

        for (var i = 0; i < hostSeat.Hand.Count; i++)
        {
            Assert.Equal(hostSeat.Hand[i].Id.Value, snapshot.MyHand[i].Id);
            Assert.Equal(hostSeat.Hand[i].Protocol.ToString(), snapshot.MyHand[i].Protocol);
        }
    }

    [Fact]
    public void Project_OpponentsCardsAreStrictlyMasked_ContainsZeroForeignCardData()
    {
        var (room, hostId, p2Id, p3Id) = CreateActiveThreePlayerRoom();
        var p2Seat = room.Seats.First(s => s.Id == p2Id);
        var p3Seat = room.Seats.First(s => s.Id == p3Id);

        var opponentCardIds = p2Seat.Hand.Concat(p3Seat.Hand)
            .Select(c => c.Id.Value)
            .ToHashSet();

        var snapshot = GameStateProjector.Project(room, hostId);

        // 1. None of the opponent card IDs appear in MyHand
        Assert.DoesNotContain(snapshot.MyHand, c => opponentCardIds.Contains(c.Id));

        // 2. Seats only expose count, matching actual hand sizes
        var p2SeatDto = snapshot.Seats.FirstOrDefault(s => s.PlayerId == p2Id.Value);
        var p3SeatDto = snapshot.Seats.FirstOrDefault(s => s.PlayerId == p3Id.Value);

        Assert.NotNull(p2SeatDto);
        Assert.NotNull(p3SeatDto);
        Assert.Equal(p2Seat.Hand.Count, p2SeatDto.HandCount);
        Assert.Equal(p3Seat.Hand.Count, p3SeatDto.HandCount);

        // 3. Serialize snapshot to JSON and assert that no foreign CardId GUID appears anywhere in the serialized payload
        var json = JsonSerializer.Serialize(snapshot);
        foreach (var foreignCardId in opponentCardIds)
        {
            Assert.DoesNotContain(foreignCardId.ToString(), json);
        }
    }

    [Fact]
    public void Project_TablePileCardsAreMasked_ExposesOnlyTotalCount()
    {
        var (room, hostId, p2Id, _) = CreateActiveThreePlayerRoom();
        var hostSeat = room.Seats.First(s => s.Id == hostId);

        // Current turn is host (index 0)
        Assert.Equal(hostId, room.CurrentTurnPlayerId);
        var cardsToPlay = hostSeat.Hand.Take(2).Select(c => c.Id).ToList();
        var playedCardGuids = cardsToPlay.Select(c => c.Value).ToHashSet();

        var playResult = room.PlayCards(hostId, cardsToPlay, room.CurrentTargetProtocol!.Value);
        Assert.True(playResult.IsSuccess);
        Assert.Equal(2, room.TablePile.Count);

        // Project state for Player 2
        var p2Snapshot = GameStateProjector.Project(room, p2Id);

        Assert.Equal(2, p2Snapshot.TablePileCount);

        // Assert played cards do not appear anywhere in Player 2's snapshot
        var json = JsonSerializer.Serialize(p2Snapshot);
        foreach (var cardGuid in playedCardGuids)
        {
            Assert.DoesNotContain(cardGuid.ToString(), json);
        }
    }

    [Fact]
    public void Project_BurnedPileAndRemainingDeckAreNeverExposed()
    {
        var (room, hostId, _, _) = CreateActiveThreePlayerRoom();
        Assert.NotNull(room.CurrentDeck);

        var burnedCardGuids = room.CurrentDeck.BurnedPile
            .Select(c => c.Id.Value)
            .ToHashSet();

        Assert.NotEmpty(burnedCardGuids);

        var snapshot = GameStateProjector.Project(room, hostId);
        var json = JsonSerializer.Serialize(snapshot);

        foreach (var burnedGuid in burnedCardGuids)
        {
            Assert.DoesNotContain(burnedGuid.ToString(), json);
        }
    }

    [Fact]
    public void Project_TraceResolution_RevealsOnlyChallengedCards()
    {
        var (room, hostId, p2Id, p3Id) = CreateActiveThreePlayerRoom();
        var hostSeat = room.Seats.First(s => s.Id == hostId);

        // Host plays 2 cards
        var playedCards = hostSeat.Hand.Take(2).Select(c => c.Id).ToList();
        var playResult = room.PlayCards(hostId, playedCards, room.CurrentTargetProtocol!.Value);
        Assert.True(playResult.IsSuccess);

        // Player 2 calls Trace
        var traceResult = room.CallTrace(p2Id);
        Assert.True(traceResult.IsSuccess);

        // Project state for Player 3 (third-party observer to the trace)
        var p3Snapshot = GameStateProjector.Project(room, p3Id);

        Assert.NotNull(p3Snapshot.LastTraceResolution);
        Assert.Equal(p2Id.Value, p3Snapshot.LastTraceResolution.AccuserPlayerId);
        Assert.Equal(hostId.Value, p3Snapshot.LastTraceResolution.AccusedPlayerId);
        Assert.Equal(2, p3Snapshot.LastTraceResolution.RevealedCards.Count);

        var revealedGuids = p3Snapshot.LastTraceResolution.RevealedCards.Select(c => c.Id).ToHashSet();
        foreach (var playedId in playedCards)
        {
            Assert.Contains(playedId.Value, revealedGuids);
        }
    }

    [Fact]
    public void Project_MultiPlayerSymmetry_ZeroLeakageCrossCheck()
    {
        var (room, playerIds) = CreateActiveFourPlayerRoom();

        // 4 players, 5 cards each
        var handsByPlayer = playerIds.ToDictionary(
            pid => pid,
            pid => room.Seats.First(s => s.Id == pid).Hand.Select(c => c.Id.Value).ToHashSet());

        foreach (var recipientId in playerIds)
        {
            var snapshot = GameStateProjector.Project(room, recipientId);
            var myExpectedCards = handsByPlayer[recipientId];

            Assert.Equal(myExpectedCards.Count, snapshot.MyHand.Count);
            foreach (var card in snapshot.MyHand)
            {
                Assert.Contains(card.Id, myExpectedCards);
            }

            var snapshotJson = JsonSerializer.Serialize(snapshot);

            // Cross-check against every other player
            foreach (var otherPlayerId in playerIds.Where(id => id != recipientId))
            {
                var opponentCards = handsByPlayer[otherPlayerId];
                foreach (var opponentCardId in opponentCards)
                {
                    Assert.DoesNotContain(opponentCardId.ToString(), snapshotJson);
                }
            }
        }
    }

    [Fact]
    public void Project_SpectatorOrUnknownPlayer_ReceivesEmptyHandWithoutLeakage()
    {
        var (room, hostId, p2Id, _) = CreateActiveThreePlayerRoom();
        var alienId = PlayerId.New();

        var snapshot = GameStateProjector.Project(room, alienId);

        Assert.Empty(snapshot.MyHand);
        Assert.Equal(alienId.Value, snapshot.MyPlayerId);
        Assert.Equal(3, snapshot.Seats.Count);

        // Opponents' card IDs still do not appear
        var allPlayerCardGuids = room.Seats
            .SelectMany(s => s.Hand)
            .Select(c => c.Id.Value)
            .ToList();

        var json = JsonSerializer.Serialize(snapshot);
        foreach (var cardGuid in allPlayerCardGuids)
        {
            Assert.DoesNotContain(cardGuid.ToString(), json);
        }
    }

    [Fact]
    public void Project_PreservesAllRoomMetadata()
    {
        var (room, hostId, _, _) = CreateActiveThreePlayerRoom();

        var snapshot = GameStateProjector.Project(room, hostId);

        Assert.Equal(room.Id.Value, snapshot.RoomCode);
        Assert.Equal(room.State.ToString(), snapshot.State);
        Assert.Equal(room.HostId.Value, snapshot.HostId);
        Assert.Equal(room.CurrentTargetProtocol?.ToString(), snapshot.CurrentTargetProtocol);
        Assert.Equal(room.CurrentTurnPlayerId?.Value, snapshot.CurrentTurnPlayerId);
        Assert.Equal(room.RoundNumber, snapshot.RoundNumber);
        Assert.Null(snapshot.WinnerId);
    }

    [Fact]
    public void Project_NullRoom_ThrowsArgumentNullException()
    {
        var (_, hostId, _, _) = CreateActiveThreePlayerRoom();

        Assert.Throws<ArgumentNullException>(() => GameStateProjector.Project(null!, hostId));
    }

    [Fact]
    public void Project_IGameStateProjector_InstanceMethod_ProducesSameResult()
    {
        var (room, hostId, _, _) = CreateActiveThreePlayerRoom();
        IGameStateProjector projector = new GameStateProjector();

        var staticSnapshot = GameStateProjector.Project(room, hostId);
        var instanceSnapshot = projector.Project(room, hostId);

        Assert.Equal(staticSnapshot.RoomCode, instanceSnapshot.RoomCode);
        Assert.Equal(staticSnapshot.MyPlayerId, instanceSnapshot.MyPlayerId);
        Assert.Equal(staticSnapshot.MyHand.Count, instanceSnapshot.MyHand.Count);
        Assert.Equal(staticSnapshot.Seats.Count, instanceSnapshot.Seats.Count);
        Assert.Equal(staticSnapshot.TablePileCount, instanceSnapshot.TablePileCount);
    }
}
