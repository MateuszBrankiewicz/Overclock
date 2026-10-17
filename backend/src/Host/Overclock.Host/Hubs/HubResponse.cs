using Ardalis.Result;

namespace Overclock.Host.Hubs;

public sealed record HubResponse(bool IsSuccess, string? Error = null, string? ErrorCode = null)
{
    public static HubResponse Success() => new(true);

    public static HubResponse Failure(string error, string? errorCode = null) => new(false, error, errorCode);

    public static HubResponse From(Result result)
    {
        if (result.IsSuccess)
        {
            return Success();
        }

        var error = result.Errors.Skip(1).FirstOrDefault()
            ?? result.Errors.FirstOrDefault()
            ?? result.ValidationErrors.FirstOrDefault()?.ErrorMessage
            ?? "Operation failed.";

        var code = result.ValidationErrors.FirstOrDefault()?.Identifier
            ?? result.Errors.FirstOrDefault();

        return Failure(error, code);
    }
}

public sealed record HubResponse<T>(bool IsSuccess, T? Data = default, string? Error = null, string? ErrorCode = null)
{
    public static HubResponse<T> Success(T data) => new(true, data);

    public static HubResponse<T> Failure(string error, string? errorCode = null) => new(false, default, error, errorCode);

    public static HubResponse<T> From(Result<T> result)
    {
        if (result.IsSuccess)
        {
            return Success(result.Value);
        }

        var error = result.Errors.Skip(1).FirstOrDefault()
            ?? result.Errors.FirstOrDefault()
            ?? result.ValidationErrors.FirstOrDefault()?.ErrorMessage
            ?? "Operation failed.";

        var code = result.ValidationErrors.FirstOrDefault()?.Identifier
            ?? result.Errors.FirstOrDefault();

        return Failure(error, code);
    }
}
