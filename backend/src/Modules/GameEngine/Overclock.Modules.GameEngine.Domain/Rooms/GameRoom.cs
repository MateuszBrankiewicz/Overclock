using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Characters;
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
    public DateTime? CurrentTurnDeadlineUtc { get; private set; }
    public DateTime? IntermissionDeadlineUtc { get; private set; }
    public long TurnSequenceId { get; private set; }
    public long DischargeSequenceId { get; private set; } = 1;
    public PlayedTurn? LastPlay { get; private set; }
    public TraceResolution? LastTraceResolution { get; private set; }
    public PlayerId? PendingDischargePlayerId { get; private set; }
    public DischargeOutcome? LastDischargeOutcome { get; private set; }
    public long? LastInjectedTurnSequenceId { get; private set; }
    public int RoundNumber { get; private set; }
    public int MatchRoundCount { get; private set; }
    public DateTimeOffset? MatchStartedAtUtc { get; private set; }
    public long EventSequenceNumber => _eventSequenceNumberInternal;

    public long NextEventSequence() => Interlocked.Increment(ref _eventSequenceNumberInternal);
    private long _eventSequenceNumberInternal = 1;

    public PlayerId? WinnerId => State == RoomState.GameOver
        ? _seats.FirstOrDefault(s => s.Status != PlayerStatus.Eliminated)?.Id
        : null;

    public bool IsEmpty => _seats.Count == 0 || _seats.All(s => s.HasLeft);

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
        Guid sessionToken,
        string? preferredCharacterId = null)
    {
        if (string.IsNullOrWhiteSpace(id.Value))
        {
            return Result<GameRoom>.Invalid(new ValidationError("Room.InvalidId", "Room identifier cannot be empty."));
        }

        if (string.IsNullOrWhiteSpace(hostNickname))
        {
            return Result<GameRoom>.Invalid(new ValidationError("Room.InvalidNickname", "Host nickname cannot be empty."));
        }

        var characterId = CharacterCatalog.IsValid(preferredCharacterId)
            ? preferredCharacterId!
            : CharacterCatalog.DefaultId;

        var hostSeat = new PlayerSeat(hostId, hostNickname, connectionId, sessionToken, characterId);
        var room = new GameRoom(id, hostId, hostSeat);
        return Result<GameRoom>.Success(room);
    }

    public Result<PlayerSeat> AddPlayer(
        PlayerId playerId,
        string nickname,
        string connectionId,
        Guid sessionToken,
        string? preferredCharacterId = null)
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

        var characterId = ResolveAvailableCharacterId(preferredCharacterId);
        var seat = new PlayerSeat(playerId, nickname, connectionId, sessionToken, characterId);
        if (_seats.Count == 0)
        {
            HostId = playerId;
        }

        _seats.Add(seat);
        return Result<PlayerSeat>.Success(seat);
    }

    private string ResolveAvailableCharacterId(string? preferredCharacterId)
    {
        if (CharacterCatalog.IsValid(preferredCharacterId) &&
            !_seats.Any(s => !s.HasLeft && s.CharacterId == preferredCharacterId))
        {
            return preferredCharacterId!;
        }

        return CharacterCatalog.All.FirstOrDefault(id => !_seats.Any(s => !s.HasLeft && s.CharacterId == id))
            ?? CharacterCatalog.DefaultId;
    }

    public Result SelectCharacter(PlayerId playerId, string characterId)
    {
        if (State != RoomState.Lobby)
        {
            return Result.Conflict("Room.NotInLobby", "Characters can only be selected in the lobby.");
        }

        if (!CharacterCatalog.IsValid(characterId))
        {
            return Result.Invalid(new ValidationError("Room.InvalidCharacter", $"Character '{characterId}' is not valid."));
        }

        var seat = _seats.Find(s => s.Id == playerId);
        if (seat is null)
        {
            return Result.NotFound("Room.PlayerNotFound", $"Player with ID '{playerId}' is not in this room.");
        }

        if (seat.CharacterId == characterId)
        {
            return Result.Success();
        }

        if (_seats.Any(s => s.Id != playerId && !s.HasLeft && s.CharacterId == characterId))
        {
            return Result.Conflict("Room.CharacterTaken", $"Character '{characterId}' is already taken by another player.");
        }

        seat.AssignCharacter(characterId);
        return Result.Success();
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
            var nextHost = HostSuccession.NextHost(_seats, playerId);
            HostId = nextHost ?? default;
        }

        return Result.Success();
    }

    public Result<LeaveOutcome> Leave(PlayerId playerId)
    {
        var seat = _seats.Find(s => s.Id == playerId);
        if (seat is null || seat.HasLeft)
        {
            return Result<LeaveOutcome>.Success(new LeaveOutcome(IsEmpty, null, false));
        }

        if (State == RoomState.Lobby || State == RoomState.GameOver)
        {
            var wasHost = HostId == playerId;
            _seats.Remove(seat);
            PlayerId? nextHost = null;
            if (wasHost)
            {
                nextHost = HostSuccession.NextHost(_seats, playerId);
                HostId = nextHost ?? default;
            }

            return Result<LeaveOutcome>.Success(new LeaveOutcome(IsEmpty, wasHost ? nextHost : null, false));
        }

        var oldHostId = HostId;
        var wasPendingDischarge = PendingDischargePlayerId == playerId;

        seat.MarkLeft();
        EliminatePlayer(playerId);

        if (wasPendingDischarge)
        {
            PendingDischargePlayerId = null;
            DischargeSequenceId++;
            var remainingActive = _seats.Count(s => s.Status != PlayerStatus.Eliminated);
            if (remainingActive > 1 && State != RoomState.GameOver)
            {
                State = RoomState.RoundOver;
            }
        }

        var hostChangedTo = HostId != oldHostId ? (PlayerId?)HostId : null;
        return Result<LeaveOutcome>.Success(new LeaveOutcome(IsEmpty, hostChangedTo, true));
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

        if (isNewMatch)
        {
            _seats.RemoveAll(s => s.HasLeft);
        }

        // Determine prospective active seats without mutating state before validation
        var prospectiveActiveSeats = isNewMatch
            ? _seats.Where(s => !s.HasLeft && (s.Status != PlayerStatus.Eliminated || State == RoomState.GameOver)).ToList()
            : _seats.Where(s => !s.HasLeft && s.Status != PlayerStatus.Eliminated).ToList();

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
            MatchStartedAtUtc = DateTimeOffset.UtcNow;
            MatchRoundCount = 0;
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
        CurrentTurnDeadlineUtc = null;
        IntermissionDeadlineUtc = null;
        RoundNumber++;
        MatchRoundCount++;
        TurnSequenceId++;

        // Determine starting player
        var startingPlayerIndex = (RoundNumber - 1) % activePlayers.Count;
        CurrentTurnPlayerId = activePlayers[startingPlayerIndex].Id;

        State = RoomState.TurnActive;
        return Result.Success();
    }

    public Result AdvanceRound(IRandomSource? randomSource = null)
    {
        if (State != RoomState.RoundOver)
        {
            return Result.Conflict("Room.CannotAdvanceRound", $"Cannot advance round from state '{State}'.");
        }

        var rng = randomSource ?? CryptoRandomSource.Instance;

        var prospectiveActiveSeats = _seats.Where(s => !s.HasLeft && s.Status != PlayerStatus.Eliminated).ToList();
        if (prospectiveActiveSeats.Count < Deck.MinPlayers)
        {
            return Result.Invalid(new ValidationError(
                "Room.InsufficientPlayers",
                $"At least {Deck.MinPlayers} active players are required to start a round, but found {prospectiveActiveSeats.Count}."));
        }

        var deckResult = Deck.Create(prospectiveActiveSeats.Count, rng);
        if (!deckResult.IsSuccess)
        {
            return Result.Invalid(deckResult.ValidationErrors);
        }

        foreach (var seat in prospectiveActiveSeats)
        {
            seat.ResetForNewRound();
        }

        State = RoomState.Dealing;
        CurrentDeck = deckResult.Value;

        foreach (var player in prospectiveActiveSeats)
        {
            var dealResult = CurrentDeck.DealHand();
            if (!dealResult.IsSuccess)
            {
                return Result.Invalid(dealResult.ValidationErrors);
            }

            player.AssignHand(dealResult.Value);
        }

        var targetProtocolIndex = rng.Next(0, ValidTargetProtocols.Length);
        CurrentTargetProtocol = ValidTargetProtocols[targetProtocolIndex];

        _tablePile.Clear();
        LastPlay = null;
        LastTraceResolution = null;
        LastDischargeOutcome = null;
        PendingDischargePlayerId = null;
        CurrentTurnDeadlineUtc = null;
        IntermissionDeadlineUtc = null;
        RoundNumber++;
        MatchRoundCount++;
        TurnSequenceId++;

        var startingPlayerIndex = (RoundNumber - 1) % prospectiveActiveSeats.Count;
        CurrentTurnPlayerId = prospectiveActiveSeats[startingPlayerIndex].Id;

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

        // Last holder rule: once every rival has emptied their hand, nobody could ever challenge
        // another play, so the last player still holding cards must call TRACE on the previous play.
        if (LastPlay is not null && LastPlay.PlayerId != playerId && !AnyRivalHoldsCards(playerId))
        {
            return Result.Invalid(new ValidationError(
                "Turn.MustCallTrace",
                "Every rival has emptied their hand; the last player holding cards must call TRACE."));
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
            CurrentTurnDeadlineUtc = null;
            return Result.Success();
        }

        // Advance to next active player with cards
        var nextPlayerId = GetNextTurnPlayerId(playerId);
        if (nextPlayerId is null)
        {
            State = RoomState.RoundOver;
            CurrentTurnPlayerId = null;
            CurrentTurnDeadlineUtc = null;
        }
        else
        {
            CurrentTurnPlayerId = nextPlayerId.Value;
            CurrentTurnDeadlineUtc = null;
            TurnSequenceId++;
        }

        return Result.Success();
    }

    public Result MarkTurnDeadline(DateTime deadlineUtc)
    {
        if (State != RoomState.TurnActive)
        {
            return Result.Invalid(new ValidationError("Room.NotInTurnActive", $"Cannot set turn deadline in state '{State}'."));
        }

        CurrentTurnDeadlineUtc = deadlineUtc;
        return Result.Success();
    }

    public Result MarkIntermissionDeadline(DateTime deadlineUtc)
    {
        if (State != RoomState.RoundOver)
        {
            return Result.Invalid(new ValidationError("Room.NotInRoundOver", $"Cannot set intermission deadline in state '{State}'."));
        }

        IntermissionDeadlineUtc = deadlineUtc;
        return Result.Success();
    }

    public Result<TurnExpiredOutcome> ExpireTurn(PlayerId playerId, long turnSequenceId)
    {
        if (State != RoomState.TurnActive)
        {
            return Result<TurnExpiredOutcome>.Conflict(
                "Turn.NotActive",
                $"Cannot expire a turn in room state '{State}'.");
        }

        if (turnSequenceId != TurnSequenceId)
        {
            return Result<TurnExpiredOutcome>.Conflict(
                "Turn.StaleSequence",
                $"Turn sequence '{turnSequenceId}' is no longer active.");
        }

        if (CurrentTurnPlayerId != playerId)
        {
            return Result<TurnExpiredOutcome>.Invalid(new ValidationError(
                "Turn.NotYourTurn",
                $"Player '{playerId}' does not own the active turn."));
        }

        if (LastPlay is not null)
        {
            var traceResult = CallTrace(playerId);
            if (!traceResult.IsSuccess)
            {
                return traceResult.ToResult<TurnExpiredOutcome>();
            }

            return Result<TurnExpiredOutcome>.Success(new TurnExpiredOutcome.AutoTrace(traceResult.Value));
        }

        State = RoomState.VoltageTest;
        PendingDischargePlayerId = playerId;
        CurrentTurnPlayerId = null;
        CurrentTurnDeadlineUtc = null;
        DischargeSequenceId++;

        return Result<TurnExpiredOutcome>.Success(new TurnExpiredOutcome.LeadForfeit(playerId));
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
        CurrentTurnDeadlineUtc = null;

        return Result<TraceResolution>.Success(resolution);
    }

    public Result CompleteBluffCheck()
    {
        if (State != RoomState.BluffCheck)
        {
            return Result.Conflict("Room.NotInBluffCheck", $"Cannot complete bluff check in state '{State}'.");
        }

        State = RoomState.VoltageTest;
        CurrentTurnDeadlineUtc = null;
        DischargeSequenceId++;
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

        CurrentTurnDeadlineUtc = null;
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

        if (seat.HasLeft)
        {
            return Result<PlayerSeat>.Forbidden("Seat.Left");
        }

        if (seat.Status == PlayerStatus.Eliminated)
        {
            return Result<PlayerSeat>.Invalid(new ValidationError(
                "Room.PlayerEliminated",
                "Cannot reconnect as an active player because this seat has been eliminated."));
        }

        var reconnectResult = seat.Reconnect(newConnectionId);
        if (!reconnectResult.IsSuccess)
        {
            return reconnectResult.ToResult<PlayerSeat>();
        }

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
            var nextHost = HostSuccession.NextHost(_seats, playerId);
            if (nextHost is not null)
            {
                HostId = nextHost.Value;
            }
        }

        var remainingActive = _seats.Count(s => s.Status != PlayerStatus.Eliminated);
        if (remainingActive <= 1)
        {
            State = RoomState.GameOver;
            CurrentTurnPlayerId = null;
            CurrentTurnDeadlineUtc = null;
            IntermissionDeadlineUtc = null;
            return Result.Success();
        }

        if (CurrentTurnPlayerId == playerId)
        {
            var nextPlayer = GetNextTurnPlayerId(playerId);
            if (nextPlayer is null)
            {
                State = RoomState.RoundOver;
                CurrentTurnPlayerId = null;
                CurrentTurnDeadlineUtc = null;
            }
            else
            {
                CurrentTurnPlayerId = nextPlayer.Value;
                CurrentTurnDeadlineUtc = null;
                TurnSequenceId++;
            }
        }

        return Result.Success();
    }

    private bool AnyRivalHoldsCards(PlayerId playerId) =>
        _seats.Exists(s => s.Id != playerId && s.Status != PlayerStatus.Eliminated && s.Hand.Count > 0);

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
