using Ardalis.Result;
using Overclock.SharedKernel;
using Xunit;

namespace GameEngine.Domain.Tests;

public class ResultExtensionsTests
{
    [Fact]
    public void ToResult_PreservesConflictStatusAndErrors()
    {
        var source = Result.Conflict("Room.NotInLobby", "Cannot join while match in progress.");

        var mapped = source.ToResult<string>();

        Assert.Equal(ResultStatus.Conflict, mapped.Status);
        Assert.Equal(2, mapped.Errors.Count());
        Assert.Equal("Room.NotInLobby", mapped.Errors.First());
        Assert.Equal("Cannot join while match in progress.", mapped.Errors.Skip(1).First());
    }

    [Fact]
    public void ToResult_PreservesNotFoundStatusAndErrors()
    {
        var source = Result.NotFound("Room.NotFound");

        var mapped = source.ToResult<int>();

        Assert.Equal(ResultStatus.NotFound, mapped.Status);
        Assert.Single(mapped.Errors);
        Assert.Equal("Room.NotFound", mapped.Errors.First());
    }

    [Fact]
    public void ToResult_PreservesValidationErrors()
    {
        var validationErrors = new List<ValidationError>
        {
            new("Room.Full", "Room is full.")
        };
        var source = Result.Invalid(validationErrors);

        var mapped = source.ToResult<bool>();

        Assert.Equal(ResultStatus.Invalid, mapped.Status);
        Assert.Single(mapped.ValidationErrors);
        Assert.Equal("Room.Full", mapped.ValidationErrors.First().Identifier);
        Assert.Equal("Room is full.", mapped.ValidationErrors.First().ErrorMessage);
    }

    [Fact]
    public void ToResult_GenericSource_PreservesConflict()
    {
        var source = Result<int>.Conflict("Room.AlreadyStarted");

        var mapped = source.ToResult<string>();

        Assert.Equal(ResultStatus.Conflict, mapped.Status);
        Assert.Equal("Room.AlreadyStarted", mapped.Errors.First());
    }

    [Fact]
    public void ToResult_NonGeneric_PreservesForbidden()
    {
        var source = Result<int>.Forbidden("Action.Forbidden");

        var mapped = source.ToResult();

        Assert.Equal(ResultStatus.Forbidden, mapped.Status);
        Assert.Equal("Action.Forbidden", mapped.Errors.First());
    }
}
