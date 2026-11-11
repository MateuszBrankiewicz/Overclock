using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Exploits;
using Overclock.Modules.GameEngine.Domain.Services;
using Overclock.Modules.GameEngine.Domain.Voltage;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Domain.Rooms;

public sealed class GameRoom
{
    private static readonly CardProtocol[] ValidTargetProtocols =
    [
        CardProtocol.Alpha,
        CardProtocol.Beta,
        CardProtocol.Gamma
    ];

    private readonly List<PlayerSeat> _seats = [];
    private readonly List<Card> _tablePile = [];

    public RoomId Id { get; }
    public PlayerId HostId { get; private set; }
    public RoomState State { get; private set; }
    public IReadOnlyList<PlayerSeat> Seats => _seats;
    public IReadOnlyList<Card> TablePile => _tablePile;
    public Deck? CurrentDeck { get; private set; }
    public CardProtocol? CurrentTargetProtocol { get; private set; }
    public PlayerId? CurrentTurnPlayerId { get; private set; }
    public long TurnSequenceId { get; private set; }
    public PlayedTurn? LastPlay { get; private set; }
    public TraceResolution? LastTraceResolution { get; private set; }
    public PlayerId? PendingDischargePlayerId { get; private set; }
    public DischargeOutcome? LastDischargeOutcome { get; private set; }
    public long? LastInjectedTurnSequenceId { get; private set; }
    public int RoundNumber { get; private set; }
    public long EventSequenceNumber => _eventSequenceNumberInternal;

    public long NextEventSequence() => Interlocked.Increment(ref _eventSequenceNumberInternal);
    private long _eventSequenceNumberInternal = 1;

    public PlayerId? WinnerId => State == RoomState.GameOver
        ? _seats.FirstOrDefault(s => s.Status != PlayerStatus.Eliminated)?.Id
        : null;

    private GameRoom(RoomId id, PlayerId hostId, PlayerSeat hostSeat)
    {
        Id = id;
        HostId = hostId;
        State = RoomState.Lobby;
        _seats.Add(hostSeat);
    }

    public static Result<GameRoom> Create(
        RoomId id,
        PlayerId hostId,
        string hostNickname,
        string connectionId,
        Guid sessionToken)
    {
        if (string.IsNullOrWhiteSpace(id.Value))
        {
            return Result<GameRoom>.Invalid(new ValidationError("Room.InvalidId", "Room identifier cannot be empty."));
        }

        if (string.IsNullOrWhiteSpace(hostNickname))
        {
            return Result<GameRoom>.Invalid(new ValidationError("Room.InvalidNickname", "Host nickname cannot be empty."));
        }

        var hostSeat = new PlayerSeat(hostId, hostNickname, connectionId, sessionToken);
        var room = new GameRoom(id, hostId, hostSeat);
        return Result<GameRoom>.Success(room);
    }

    public Result<PlayerSeat> AddPlayer(
        PlayerId playerId,
        string nickname,
        string connectionId,
        Guid sessionToken)
    {
        if (State != RoomState.Lobby)
        {
            return Result<PlayerSeat>.Conflict("Room.NotInLobby", $"Cannot join room in state '{State}'.");
        }

        if (_seats.Count >= Deck.MaxPlayers)
        {
            return Result<PlayerSeat>.Invalid(new ValidationError(
                "Room.Full",
                $"Room has reached the maximum capacity of {Deck.MaxPlayers} players."));
        }

        if (_seats.Any(s => s.Id == playerId))
        {
            return Result<PlayerSeat>.Invalid(new ValidationError(
                "Room.PlayerAlreadyJoined",
                $"Player with ID '{playerId}' has already joined this room."));
        }

        if (_seats.Any(s => s.SessionToken == sessionToken))
        {
            return Result<PlayerSeat>.Invalid(new ValidationError(
                "Room.DuplicateSessionToken",
                "A player with this session token already exists in the room."));
        }

        if (string.IsNullOrWhiteSpace(nickname))
        {
            return Result<PlayerSeat>.Invalid(new ValidationError(
                "Room.InvalidNickname",
                "Player nickname cannot be empty."));
        }

        var seat = new PlayerSeat(playerId, nickname, connectionId, sessionToken);
        if (_seats.Count == 0)
        {
            HostId = playerId;
        }

        _seats.Add(seat);
        return Result<PlayerSeat>.Success(seat);
    }

    public Result RemovePlayer(PlayerId playerId)
    {
        if (State != RoomState.Lobby)
        {
            return Result.Conflict("Room.NotInLobby", "Players can only be removed while in the lobby.");
        }

        var seat = _seats.Find(s => s.Id == playerId);
        if (seat is null)
        {
            return Result.NotFound("Room.PlayerNotFound", $"Player with ID '{playerId}' is not in this room.");
        }

        _seats.Remove(seat);

        if (HostId == playerId)
        {
            HostId = _seats.Count > 0 ? _seats[0].Id : default;
        }

        return Result.Success();
    }

    public Result SetReady(PlayerId playerId, bool isReady)
    {
        if (State != RoomState.Lobby)
        {
            return Result.Conflict("Room.NotInLobby", "Readiness can only be changed in the lobby.");
        }

        var seat = _seats.Find(s => s.Id == playerId);
        if (seat is null)
        {
            return Result.NotFound("Room.PlayerNotFound", $"Player with ID '{playerId}' is not in this room.");
        }

        seat.SetReady(isReady);
        return Result.Success();
    }

    public Result StartRound(PlayerId requesterId, IRandomSource? randomSource = null)
    {
        if (State != RoomState.Lobby && State != RoomState.RoundOver && State != RoomState.GameOver)
        {
            return Result.Conflict("Room.CannotStartRound", $"Cannot start a round in state '{State}'.");
        }

        if (requesterId != HostId)
        {
            return Result.Invalid(new ValidationError(
                "Room.OnlyHostCanStart",
                $"Only the room host '{HostId}' can start the round."));
        }

        var isNewMatch = State == RoomState.Lobby || State == RoomState.GameOver;
        var rng = randomSource ?? CryptoRandomSource.Instance;

        // Determine prospective active seats without mutating state before validation
        var prospectiveActiveSeats = isNewMatch
            ? _seats.Where(s => s.Status != PlayerStatus.Eliminated || State == RoomState.GameOver).ToList()
            : _seats.Where(s => s.Status != PlayerStatus.Eliminated).ToList();

        if (prospectiveActiveSeats.Count < Deck.MinPlayers)
        {
            return Result.Invalid(new ValidationError(
                "Room.InsufficientPlayers",
                $"At least {Deck.MinPlayers} active players are required to start a round, but found {prospectiveActiveSeats.Count}."));
        }

        if (State == RoomState.Lobby && !prospectiveActiveSeats.All(s => s.IsReady))
        {
            return Result.Invalid(new ValidationError(
                "Room.NotAllPlayersReady",
                "All players must be ready before starting the match."));
        }

        var deckResult = Deck.Create(prospectiveActiveSeats.Count, rng);
        if (!deckResult.IsSuccess)
        {
            return Result.Invalid(deckResult.ValidationErrors);
        }

        // All guards passed: perform state mutations
        if (isNewMatch)
        {
            // Reset seats for new match: assign fresh exploit and reset risk to 1/6
            foreach (var seat in _seats)
            {
                var exploitType = ExploitCatalog.All[rng.Next(0, ExploitCatalog.All.Count)];
                seat.ResetForMatch(new ExploitModule(exploitType));
            }
        }
        else
        {
            // Reset seats for next round in same match: clear hands, preserve survived risk & burned exploit status
            foreach (var seat in _seats.Where(s => s.Status != PlayerStatus.Eliminated))
            {
                seat.ResetForNewRound();
            }
        }

        var activePlayers = _seats.Where(s => s.Status != PlayerStatus.Eliminated).ToList();
        State = RoomState.Dealing;
        CurrentDeck = deckResult.Value;

        // Deal hands to each active player
        foreach (var player in activePlayers)
        {
            var dealResult = CurrentDeck.DealHand();
            if (!dealResult.IsSuccess)
            {
                return Result.Invalid(dealResult.ValidationErrors);
            }

            player.AssignHand(dealResult.Value);
        }

        // Set table target protocol
        var targetProtocolIndex = rng.Next(0, ValidTargetProtocols.Length);
        CurrentTargetProtocol = ValidTargetProtocols[targetProtocolIndex];

        // Clear round transient state
        _tablePile.Clear();
        LastPlay = null;
        LastTraceResolution = null;
        LastDischargeOutcome = null;
        PendingDischargePlayerId = null;
        RoundNumber++;
        TurnSequenceId++;

        // Determine starting player
        var startingPlayerIndex = (RoundNumber - 1) % activePlayers.Count;
        CurrentTurnPlayerId = activePlayers[startingPlayerIndex].Id;

        State = RoomState.TurnActive;
        return Result.Success();
    }

    public Result PlayCards(PlayerId playerId, IReadOnlyList<CardId> cardIds, CardProtocol declaredProtocol)
    {
        if (State != RoomState.TurnActive)
        {
            return Result.Conflict("Turn.NotActive", $"Cannot play cards in room state '{State}'.");
        }

        if (CurrentTurnPlayerId != playerId)
        {
            return Result.Invalid(new ValidationError(
                "Turn.NotYourTurn",
                $"It is not player '{playerId}' turn to play. Current turn belongs to '{CurrentTurnPlayerId}'."));
        }

        if (cardIds.Count is < 1 or > 3)
        {
            return Result.Invalid(new ValidationError(
                "Turn.InvalidCardCount",
                $"Players must play between 1 and 3 cards, but received {cardIds.Count}."));
        }

        if (cardIds.Distinct().Count() != cardIds.Count)
        {
            return Result.Invalid(new ValidationError(
                "Turn.DuplicateCardIds",
                "Cannot play duplicate card identifiers in the same turn."));
        }

        if (CurrentTargetProtocol is null || declaredProtocol != CurrentTargetProtocol.Value)
        {
            return Result.Invalid(new ValidationError(
                "Turn.MismatchedProtocol",
                $"Declared protocol '{declaredProtocol}' does not match the room target protocol '{CurrentTargetProtocol}'."));
        }

        var playerSeat = _seats.Find(s => s.Id == playerId);
        if (playerSeat is null || playerSeat.Status == PlayerStatus.Eliminated)
        {
            return Result.NotFound("Turn.PlayerNotFound", $"Player seat for '{playerId}' was not found or is eliminated.");
        }

        // Validation guard: player must hold all declared cards
        if (!playerSeat.HasCards(cardIds))
        {
            return Result.Invalid(new ValidationError(
                "Hand.MissingCards",
                "Player does not hold all specified cards in their hand."));
        }

        var removeResult = playerSeat.RemoveCards(cardIds);
        if (!removeResult.IsSuccess)
        {
            return Result.Invalid(removeResult.ValidationErrors);
        }

        var playedCards = removeResult.Value;
        _tablePile.AddRange(playedCards);

        LastPlay = new PlayedTurn(playerId, playedCards, declaredProtocol, DateTimeOffset.UtcNow);

        // Check if any players still have cards
        var remainingActivePlayers = _seats.Where(s => s.Status != PlayerStatus.Eliminated).ToList();
        var playersWithCards = remainingActivePlayers.Where(s => s.Hand.Count > 0).ToList();

        if (playersWithCards.Count == 0)
        {
            // All players have successfully played all their cards without any challenge.
            State = RoomState.RoundOver;
            CurrentTurnPlayerId = null;
            return Result.Success();
        }

        // Advance to next active player with cards
        var nextPlayerId = GetNextTurnPlayerId(playerId);
        if (nextPlayerId is null)
        {
            State = RoomState.RoundOver;
            CurrentTurnPlayerId = null;
        }
        else
        {
            CurrentTurnPlayerId = nextPlayerId.Value;
            TurnSequenceId++;
        }

        return Result.Success();
    }

    public Result<TurnExpired> ExpireTurn(PlayerId playerId, long turnSequenceId)
    {
        if (State != RoomState.TurnActive)
        {
            return Result<TurnExpired>.Conflict(
                "Turn.NotActive",
                $"Cannot expire a turn in room state '{State}'.");
        }

        if (turnSequenceId != TurnSequenceId)
        {
            return Result<TurnExpired>.Conflict(
                "Turn.StaleSequence",
                $"Turn sequence '{turnSequenceId}' is no longer active.");
        }

        if (CurrentTurnPlayerId != playerId)
        {
            return Result<TurnExpired>.Invalid(new ValidationError(
                "Turn.NotYourTurn",
                $"Player '{playerId}' does not own the active turn."));
        }

        var nextPlayerId = GetNextTurnPlayerId(playerId);
        if (nextPlayerId is null)
        {
            State = RoomState.RoundOver;
            CurrentTurnPlayerId = null;
        }
        else
        {
            CurrentTurnPlayerId = nextPlayerId;
            TurnSequenceId++;
        }

        return Result<TurnExpired>.Success(new TurnExpired(playerId, turnSequenceId, nextPlayerId));
    }

    public Result<TraceResolution> CallTrace(PlayerId accuserPlayerId)
    {
        if (State != RoomState.TurnActive)
        {
            return Result<TraceResolution>.Conflict("Trace.NotActive", $"Cannot call trace in state '{State}'.");
        }

        if (LastPlay is null)
        {
            return Result<TraceResolution>.Invalid(new ValidationError(
                "Trace.NoCardsPlayed",
                "Cannot call trace before any cards have been played this round."));
        }

        if (accuserPlayerId == LastPlay.PlayerId)
        {
            return Result<TraceResolution>.Invalid(new ValidationError(
                "Trace.CannotTraceSelf",
                "A player cannot challenge their own play."));
        }

        if (CurrentTurnPlayerId != accuserPlayerId)
        {
            return Result<TraceResolution>.Invalid(new ValidationError(
                "Trace.NotYourTurn",
                $"Only the active turn player '{CurrentTurnPlayerId}' can challenge the previous play."));
        }

        var accuserSeat = _seats.Find(s => s.Id == accuserPlayerId);
        if (accuserSeat is null || accuserSeat.Status == PlayerStatus.Eliminated)
        {
            return Result<TraceResolution>.NotFound(
                "Trace.AccuserNotFound",
                $"Accusing player '{accuserPlayerId}' is not an active participant in this room.");
        }

        State = RoomState.BluffCheck;

        // Check if ANY of the played cards fails to match the declared protocol
        var bluffDetected = LastPlay.Cards.Any(card => !card.MatchesProtocol(LastPlay.DeclaredProtocol));
        var loserId = bluffDetected ? LastPlay.PlayerId : accuserPlayerId;

        var resolution = new TraceResolution(
            accuserPlayerId,
            LastPlay.PlayerId,
            loserId,
            LastPlay.Cards,
            LastPlay.DeclaredProtocol,
            bluffDetected);

        LastTraceResolution = resolution;
        PendingDischargePlayerId = loserId;
        CurrentTurnPlayerId = null;

        return Result<TraceResolution>.Success(resolution);
    }

    public Result CompleteBluffCheck()
    {
        if (State != RoomState.BluffCheck)
        {
            return Result.Conflict("Room.NotInBluffCheck", $"Cannot complete bluff check in state '{State}'.");
        }

        State = RoomState.VoltageTest;
        return Result.Success();
    }

    public Result<DischargeOutcome> DischargeCapacitor(PlayerId targetPlayerId, IRandomSource? randomSource = null)
    {
        if (State != RoomState.VoltageTest)
        {
            return Result<DischargeOutcome>.Conflict("Voltage.NotActive", $"Cannot discharge capacitor in room state '{State}'.");
        }

        if (PendingDischargePlayerId != targetPlayerId)
        {
            return Result<DischargeOutcome>.Invalid(new ValidationError(
                "Voltage.NotPendingPlayer",
                $"Player '{targetPlayerId}' is not the pending discharge player '{PendingDischargePlayerId}'."));
        }

        var seat = _seats.Find(s => s.Id == targetPlayerId);
        if (seat is null || seat.Status == PlayerStatus.Eliminated)
        {
            return Result<DischargeOutcome>.NotFound(
                "Voltage.PlayerNotFound",
                $"Player '{targetPlayerId}' is not found or is eliminated.");
        }

        var rng = randomSource ?? CryptoRandomSource.Instance;
        var outcome = CapacitorDischargeEngine.Discharge(seat.Risk, rng);
        seat.ApplyDischarge(outcome);
        LastDischargeOutcome = outcome;
        PendingDischargePlayerId = null;

        if (outcome.Overloaded)
        {
            EliminatePlayer(targetPlayerId);
            if (State != RoomState.GameOver)
            {
                State = RoomState.RoundOver;
            }
        }
        else
        {
            var remainingActive = _seats.Count(s => s.Status != PlayerStatus.Eliminated);
            State = remainingActive <= 1 ? RoomState.GameOver : RoomState.RoundOver;
            CurrentTurnPlayerId = null;
        }

        return Result<DischargeOutcome>.Success(outcome);
    }

    public Result ValidateExploitActivation(
        PlayerId playerId,
        ExploitType exploit,
        CardProtocol? newTargetProtocol = null)
    {
        var seat = _seats.Find(s => s.Id == playerId);
        if (seat is null)
        {
            return Result.NotFound(
                "Exploit.PlayerNotFound",
                $"Player '{playerId}' is not found in this room.");
        }

        if (seat.Status == PlayerStatus.Eliminated)
        {
            return Result.Invalid(new ValidationError(
                "Exploit.PlayerEliminated",
                $"Eliminated player '{playerId}' cannot activate exploits."));
        }

        if (seat.Exploit is null || seat.Exploit.Type != exploit)
        {
            return Result.Invalid(new ValidationError(
                "Exploit.TypeMismatch",
                $"Player '{playerId}' does not hold exploit '{exploit}'. Held: '{seat.Exploit?.Type}'."));
        }

        if (seat.Exploit.IsBurned)
        {
            return Result.Invalid(new ValidationError(
                "Exploit.AlreadyBurned",
                $"Exploit '{exploit}' held by player '{playerId}' is burned and cannot be activated again."));
        }

        var timingWindow = ExploitCatalog.WindowOf(exploit);

        switch (timingWindow)
        {
            case ExploitTimingWindow.PreAction:
                if (State != RoomState.TurnActive || CurrentTurnPlayerId != playerId)
                {
                    return Result.Conflict(
                        "Exploit.InvalidTimingWindow",
                        $"Pre-Action exploit '{exploit}' can only be activated during the player's active turn.");
                }

                if (exploit == ExploitType.PacketSniffer)
                {
                    if (LastPlay is null || LastPlay.Cards.Count == 0)
                    {
                        return Result.Invalid(new ValidationError(
                            "Exploit.NoCardsToSniff",
                            "Cannot activate Packet Sniffer before any cards have been played this round."));
                    }
                }
                else if (exploit == ExploitType.EmpFlare)
                {
                    if (newTargetProtocol is not null && !ValidTargetProtocols.Contains(newTargetProtocol.Value))
                    {
                        return Result.Invalid(new ValidationError(
                            "Exploit.InvalidNewTargetProtocol",
                            "EMP Flare requires declaring a valid new target protocol (Alpha, Beta, or Gamma)."));
                    }
                }

                break;

            case ExploitTimingWindow.PreDischarge:
                if (State != RoomState.VoltageTest || PendingDischargePlayerId != playerId)
                {
                    return Result.Conflict(
                        "Exploit.InvalidTimingWindow",
                        $"Pre-Discharge exploit '{exploit}' can only be activated while awaiting capacitor discharge.");
                }

                break;

            case ExploitTimingWindow.Interrupt:
                if (State != RoomState.TurnActive)
                {
                    return Result.Conflict(
                        "Exploit.InvalidTimingWindow",
                        $"Interrupt exploit '{exploit}' can only be activated while a turn is active.");
                }

                if (CurrentTurnPlayerId == playerId)
                {
                    return Result.Invalid(new ValidationError(
                        "Exploit.CannotInterruptSelf",
                        "Cannot interrupt your own active turn."));
                }

                if (LastPlay is null)
                {
                    return Result.Invalid(new ValidationError(
                        "Exploit.NoCardsToInterrupt",
                        "Cannot interrupt before an opponent has played cards."));
                }

                if (LastInjectedTurnSequenceId == TurnSequenceId)
                {
                    return Result.Conflict(
                        "Exploit.AlreadyInjected",
                        "An Overclock Injector has already been applied to the current turn.");
                }

                break;

            default:
                return Result.Invalid(new ValidationError(
                    "Exploit.Unsupported",
                    $"Exploit '{exploit}' is not supported."));
        }

        return Result.Success();
    }

    public bool CanActivateExploit(PlayerId playerId)
    {
        var seat = _seats.Find(s => s.Id == playerId);
        if (seat?.Exploit is null || seat.Exploit.IsBurned)
        {
            return false;
        }

        return ValidateExploitActivation(playerId, seat.Exploit.Type).IsSuccess;
    }

    public Result<ExploitEffect> ActivateExploit(
        PlayerId playerId,
        ExploitType exploit,
        CardProtocol? newTargetProtocol = null,
        IRandomSource? randomSource = null)
    {
        var validation = ValidateExploitActivation(playerId, exploit, newTargetProtocol);
        if (!validation.IsSuccess)
        {
            return validation.ToResult<ExploitEffect>();
        }

        var seat = _seats.Find(s => s.Id == playerId)!;

        switch (exploit)
        {
            case ExploitType.PacketSniffer:
                {
                    seat.BurnExploit();
                    var rng = randomSource ?? CryptoRandomSource.Instance;
                    var peekIndex = rng.Next(0, LastPlay!.Cards.Count);
                    var peekedCard = LastPlay.Cards[peekIndex];

                    return Result<ExploitEffect>.Success(new ExploitEffect.SnifferPeek(peekedCard));
                }

            case ExploitType.EmpFlare:
                {
                    if (newTargetProtocol is null || !ValidTargetProtocols.Contains(newTargetProtocol.Value))
                    {
                        return Result<ExploitEffect>.Invalid(new ValidationError(
                            "Exploit.InvalidNewTargetProtocol",
                            "EMP Flare requires declaring a valid new target protocol (Alpha, Beta, or Gamma)."));
                    }

                    seat.BurnExploit();
                    _tablePile.Clear();
                    LastPlay = null;
                    CurrentTargetProtocol = newTargetProtocol.Value;
                    TurnSequenceId++;

                    return Result<ExploitEffect>.Success(new ExploitEffect.TableReset(newTargetProtocol.Value));
                }

            case ExploitType.GroundWire:
                {
                    seat.BurnExploit();
                    var prevRisk = seat.Risk;
                    seat.HalveRisk();

                    return Result<ExploitEffect>.Success(new ExploitEffect.RiskGrounded(prevRisk, seat.Risk));
                }

            case ExploitType.OverclockInjector:
                {
                    seat.BurnExploit();
                    LastInjectedTurnSequenceId = TurnSequenceId;

                    return Result<ExploitEffect>.Success(new ExploitEffect.TurnTimerShortened(TurnSequenceId, ExploitCatalog.OverclockInjectorDuration));
                }

            default:
                return Result<ExploitEffect>.Invalid(new ValidationError(
                    "Exploit.Unsupported",
                    $"Exploit '{exploit}' is not supported."));
        }
    }

    public Result HandleDisconnect(string connectionId)
    {
        var seat = _seats.Find(s => s.ConnectionId == connectionId);
        if (seat is null)
        {
            return Result.NotFound("Room.ConnectionNotFound", $"No player seat found with connection ID '{connectionId}'.");
        }

        seat.Disconnect();
        return Result.Success();
    }

    public Result HandleDisconnect(PlayerId playerId)
    {
        var seat = _seats.Find(s => s.Id == playerId);
        if (seat is null)
        {
            return Result.NotFound("Room.PlayerNotFound", $"Player with ID '{playerId}' is not in this room.");
        }

        seat.Disconnect();
        return Result.Success();
    }

    public Result<PlayerSeat> HandleReconnect(Guid sessionToken, string newConnectionId)
    {
        var seat = _seats.Find(s => s.SessionToken == sessionToken);
        if (seat is null)
        {
            return Result<PlayerSeat>.NotFound(
                "Room.InvalidSessionToken",
                "No player seat found matching the provided session token.");
        }

        if (seat.Status == PlayerStatus.Eliminated)
        {
            return Result<PlayerSeat>.Invalid(new ValidationError(
                "Room.PlayerEliminated",
                "Cannot reconnect as an active player because this seat has been eliminated."));
        }

        seat.Reconnect(newConnectionId);
        return Result<PlayerSeat>.Success(seat);
    }

    public Result EliminatePlayer(PlayerId playerId)
    {
        var seat = _seats.Find(s => s.Id == playerId);
        if (seat is null)
        {
            return Result.NotFound("Room.PlayerNotFound", $"Player with ID '{playerId}' is not in this room.");
        }

        seat.Eliminate();

        if (HostId == playerId)
        {
            var nextHost = _seats.FirstOrDefault(s => s.Status != PlayerStatus.Eliminated);
            if (nextHost is not null)
            {
                HostId = nextHost.Id;
            }
        }

        var remainingActive = _seats.Count(s => s.Status != PlayerStatus.Eliminated);
        if (remainingActive <= 1)
        {
            State = RoomState.GameOver;
            CurrentTurnPlayerId = null;
            return Result.Success();
        }

        if (CurrentTurnPlayerId == playerId)
        {
            var nextPlayer = GetNextTurnPlayerId(playerId);
            if (nextPlayer is null)
            {
                State = RoomState.RoundOver;
                CurrentTurnPlayerId = null;
            }
            else
            {
                CurrentTurnPlayerId = nextPlayer.Value;
            }
        }

        return Result.Success();
    }

    private PlayerId? GetNextTurnPlayerId(PlayerId currentPlayerId)
    {
        var currentIndex = _seats.FindIndex(s => s.Id == currentPlayerId);
        if (currentIndex < 0)
        {
            currentIndex = 0;
        }

        for (var offset = 1; offset <= _seats.Count; offset++)
        {
            var nextIndex = (currentIndex + offset) % _seats.Count;
            var candidate = _seats[nextIndex];
            if (candidate.Status != PlayerStatus.Eliminated && candidate.Hand.Count > 0)
            {
                return candidate.Id;
            }
        }

        return null;
    }
}
